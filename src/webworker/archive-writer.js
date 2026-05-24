export class ArchiveWriter {
  /**
   * Archive writer
   * @param {WasmModule} wasmModule emscripten module
   */
  constructor(wasmModule) {
    this._wasmModule = wasmModule;
    this._runCode = wasmModule.runCode;
    this._passphrase = null;
    this._locale = "en_US.UTF-8";
  }

  async write(files, compression, format, passphrase = null) {
    // Estimate upper bound on size based on zip file fomrat
    // In some cases archive size might be bigger than the sum of all files due to header size
    const utf8encoder = new TextEncoder();
    let totalSize =
      files.reduce((acc, { file, pathname }) => {
        // Account for overhead from compression algorithm
        // Use a simple overapproximation of the zlib overhead
        let fileSize = Math.ceil(file.size * 1.01) + 32;

        // File name: assume UTF-8
        const nameSize = utf8encoder.encode(pathname || file.name.length).length;
        let headerSize = nameSize * 2 + 128;  // name is stored twice in zip files
        return acc + fileSize + headerSize;
      }, /*end of directory records + extra margin*/ 256 + 65565);

    const bufferPtr = this._runCode.malloc(totalSize);
    const outputSizePtr = this._runCode.malloc(this._runCode.sizeOfSizeT());

    const newArchive = this._runCode.startArchiveWrite(
      compression,
      format,
      bufferPtr,
      totalSize,
      outputSizePtr,
      passphrase,
    );

    for (const { file, pathname } of files) {
      const fileData = await this._loadFile(file);
      this._runCode.writeArchiveFile(
        newArchive,
        pathname || file.name,
        fileData.length,
        fileData.ptr,
      );
      this._runCode.free(fileData.ptr);
    }

    const outputSize = this._runCode.finishArchiveWrite(
      newArchive,
      outputSizePtr,
    );
    this._wasmModule._free(outputSizePtr);

    if (outputSize < 0) {
      throw new Error(this._runCode.getError(newArchive));
    }

    const data = this._wasmModule.HEAPU8.slice(bufferPtr, bufferPtr + outputSize);
    this._wasmModule._free(bufferPtr);
    return data;
  }

  async _loadFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const array = new Uint8Array(arrayBuffer);
    const filePtr = this._runCode.malloc(array.length);
    this._wasmModule.HEAPU8.set(array, filePtr);
    return {
      ptr: filePtr,
      length: array.length,
    };
  }
}
