describe('ESUtils unit tests', function () {
    var ESUtils;

    beforeEach(module('EarSketchApp'));

    beforeEach(inject(function ($injector) {
        ESUtils = $injector.get('ESUtils');
    }));

    describe('toPrecision', function () {
        it('should work', function () {
            expect(ESUtils.toPrecision(0.123456789)).toBe(0.12346);
        });
    });

    describe('roundOff', function () {
        it('should work', function () {
            expect(ESUtils.roundOff(100.37, 1)).toBe(100.4);
            expect(ESUtils.roundOff(2.401, 2)).toBe(2.40);
        });
    });

    describe('truncate', function () {
        it('should work', function () {
            expect(ESUtils.truncate(3.87, 1)).toBe(3.8);
        });
    });

    describe('randomString', function () {
        it('should result with a same-length string', function () {
            expect(ESUtils.randomString(10).length).toBe(10);
        });
    });

    describe('parseLanguage', function () {
        it('should work', function () {
            expect(ESUtils.parseLanguage('test.py')).toBe('python');
            expect(ESUtils.parseLanguage('test.js')).toBe('javascript');
        });
    });

    describe('parseName', function () {
        it('should work', function () {
            expect(ESUtils.parseName('test.abc')).toBe('test');
        });
    });

    describe('parseExt', function () {
        it('should work', function () {
            expect(ESUtils.parseExt('test.abc')).toBe('.abc');
        });
    });

    // not in ESUtil service
    // describe('decimalAdjust', function () {
    //     it('should work', function () {
    //         expect(ESUtils.decimalAdjust('round', 14.2312, 3)).toBe(14.231);
    //         expect(ESUtils.decimalAdjust('floor', 14.2312, 3)).toBe(14.000);
    //         expect(ESUtils.decimalAdjust('ceil', 14.2312, 3)).toBe(15.000);
    //     });
    // });

    describe('compareObjectStructure', function () {
        var func;

        beforeEach(function () {
            func = ESUtils.compareObjStructure;
        });

        it('should work with shallow structure', function () {
            var a = {foo: 123, bar: 456, baz: 789};
            var b = {foo: 111, bar: 222, baz: 333};
            var c = {foo: 123, bar: 456, qux: 789};
            var d = {foo: 123, bar: 456};
            var e = {foo: 123, bar: 456, baz: 789, qux: 000};

            expect(func(a, b)).toBe(true);
            expect(func(a, c)).toBe(false);
            expect(func(a, d)).toBe(false);
            expect(func(a, e)).toBe(false);
        });

        it('should work with nested structure', function () {
            var a = {foo: 123, bar: { baz: 456, qux: 789 }};
            var b = {foo: 111, bar: { baz: 222, qux: 333 }};
            var c = {foo: 111, bar: { baz: 222, meow: 333 }};
            var d = {foo: 111, bar: { baz: 222 }};
            var e = {foo: 111, bar: { baz: 222, qux: { meow: 333 }}};

            expect(func(a, b)).toBe(true);
            expect(func(a, c)).toBe(false);
            expect(func(a, d)).toBe(false);
            expect(func(a, e)).toBe(false);
        });
    });
});