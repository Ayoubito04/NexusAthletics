function noop() { }

// Mock de clase compatible con prototypes
function EventEmitter() { }
EventEmitter.prototype.on = function () { return this; };
EventEmitter.prototype.once = function () { return this; };
EventEmitter.prototype.off = function () { return this; };
EventEmitter.prototype.emit = function () { return true; };
EventEmitter.prototype.removeListener = function () { return this; };
EventEmitter.prototype.removeAllListeners = function () { return this; };
EventEmitter.prototype.setMaxListeners = function () { return this; };

function Stream() {
    EventEmitter.call(this);
}
Stream.prototype = Object.create(EventEmitter.prototype);
Stream.prototype.pipe = function (dest) { return dest; };

module.exports = {
    EventEmitter: EventEmitter,
    Stream: Stream,
    Duplex: Stream,
    Readable: Stream,
    Writable: Stream,
    Transform: Stream,
    PassThrough: Stream,
    createHash: function () { return { update: function () { return { digest: function () { return ''; } }; } }; },
    randomBytes: function () { return { toString: function () { return ''; } }; },
    inherits: function (ctor, superCtor) {
        if (superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
                constructor: { value: ctor, enumerable: false, writable: true, configurable: true }
            });
        }
    },
    default: {},
};
