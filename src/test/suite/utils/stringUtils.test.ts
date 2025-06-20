import * as assert from 'assert';
import { sanitizeName } from '../../../utils/stringUtils';

suite('StringUtils Test Suite', () => {
	test('sanitizeName should replace non-alphanumeric characters with underscores', () => {
		assert.strictEqual(sanitizeName('hello world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello-world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello.world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello!world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello@world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello#world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello$world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello%world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello^world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello&world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello*world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello(world)'), 'hello_world_');
		assert.strictEqual(sanitizeName('hello+world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello=world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello[world]'), 'hello_world_');
		assert.strictEqual(sanitizeName('hello{world}'), 'hello_world_');
		assert.strictEqual(sanitizeName('hello|world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello\\world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello;world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello:world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello\'world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello"world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello<world>'), 'hello_world_');
		assert.strictEqual(sanitizeName('hello,world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello.world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello/world'), 'hello_world');
		assert.strictEqual(sanitizeName('hello?world'), 'hello_world');
	});

	test('sanitizeName should not change alphanumeric characters', () => {
		assert.strictEqual(sanitizeName('hello123'), 'hello123');
		assert.strictEqual(sanitizeName('HELLO123'), 'HELLO123');
		assert.strictEqual(sanitizeName('Hello123'), 'Hello123');
		assert.strictEqual(sanitizeName('123hello'), '123hello');
	});

	test('sanitizeName should handle empty strings', () => {
		assert.strictEqual(sanitizeName(''), '');
	});

	test('sanitizeName should handle strings with only non-alphanumeric characters', () => {
		assert.strictEqual(sanitizeName('!@#$%^&*()'), '__________');
	});
});