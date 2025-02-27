emcc ../wrapper/main.c -c -I /usr/local/include/ -o ../build/main.o

# Unfortunately there is a bug in emscripten which causes BigInts to fail to be converted to int64 correctly,
# so we need to set WASM_BIGINT=0 (even with maximum memory set to 2GB).
# https://github.com/emscripten-core/emscripten/issues/20185

emcc ../build/main.o /usr/local/lib/libarchive.a /usr/local/lib/liblzma.a /usr/local/lib/libssl.a /usr/local/lib/libcrypto.a \
    -o ../build/libarchive.js \
    -s USE_ZLIB=1 -s USE_BZIP2=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=libarchive -s WASM=1 -O3 \
    -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=2GB -s WASM_BIGINT=0 \
    -s EXPORTED_RUNTIME_METHODS='["cwrap","allocate"]' \
    -s EXPORTED_FUNCTIONS=@$PWD/lib.exports -s ERROR_ON_UNDEFINED_SYMBOLS=0

cp ../build/libarchive.js ../../src/webworker/wasm-gen/
cp ../build/libarchive.wasm ../../src/webworker/wasm-gen/

echo Done
