module.exports = function setup(options, imports, register) {
    var base = __dirname + "/www";
    var aceActual = __dirname + "/../lib.ace";

    imports.static.addStatics([{
        path: base,
        mount: "/"
    }, {
        path: aceActual + "/www",
        mount: "/ace"
    }]);

    register(null, {
        "client.pylon": {},
        "client.ppc": {},
        "client.ace": {},
        "client.treehugger": {},
        "client.v8debug": {}
    });
};
