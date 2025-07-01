import { describe, it, expect } from 'vitest';
import { parseExpression, ExpressionEvaluator } from '../src/parser/expression.js';

describe('Expression Parser', () => {
  it('should parse simple expressions', () => {
    const parsed = parseExpression('x + y');
    
    expect(parsed.dependencies).toEqual(['x', 'y']);
    expect(parsed.execute({ x: 5, y: 3 })).toBe(8);
  });

  it('should handle string literals', () => {
    const parsed = parseExpression('"hello " + name');
    
    expect(parsed.dependencies).toEqual(['name']);
    expect(parsed.execute({ name: 'world' })).toBe('hello world');
  });

  it('should support object property access', () => {
    const parsed = parseExpression('user.name');
    
    expect(parsed.dependencies).toEqual(['user']);
    expect(parsed.execute({ user: { name: 'Alice' } })).toBe('Alice');
  });

  it('should support method calls', () => {
    const parsed = parseExpression('items.length');
    
    expect(parsed.dependencies).toEqual(['items']);
    expect(parsed.execute({ items: [1, 2, 3] })).toBe(3);
  });

  it('should handle ternary operators', () => {
    const parsed = parseExpression('condition ? a : b');
    
    expect(parsed.dependencies).toEqual(['condition', 'a', 'b']);
    expect(parsed.execute({ condition: true, a: 'yes', b: 'no' })).toBe('yes');
    expect(parsed.execute({ condition: false, a: 'yes', b: 'no' })).toBe('no');
  });

  it('should support function calls', () => {
    const parsed = parseExpression('Math.max(a, b)');
    
    expect(parsed.dependencies).toEqual(['a', 'b']);
    expect(parsed.execute({ a: 5, b: 3 })).toBe(5);
  });

  it('should handle statements', () => {
    const parsed = parseExpression('if (condition) { return value; }');
    
    expect(parsed.dependencies).toEqual(['condition', 'value']);
    expect(parsed.execute({ condition: true, value: 42 })).toBe(42);
  });

  it('should filter out keywords and globals', () => {
    const parsed = parseExpression('typeof value === "string" && console.log(value)');
    
    expect(parsed.dependencies).toEqual(['value']);
  });

  it('should handle errors gracefully', () => {
    const parsed = parseExpression('invalid.syntax.');
    
    expect(parsed.execute({})).toBeUndefined();
  });
});

describe('Expression Evaluator', () => {
  it('should cache parsed expressions', () => {
    const evaluator = new ExpressionEvaluator();
    const expression = 'x + y';
    
    const result1 = evaluator.evaluate(expression, { x: 1, y: 2 });
    const result2 = evaluator.evaluate(expression, { x: 3, y: 4 });
    
    expect(result1).toBe(3);
    expect(result2).toBe(7);
  });

  it('should get dependencies from cache', () => {
    const evaluator = new ExpressionEvaluator();
    const expression = 'user.name + " " + user.age';
    
    evaluator.evaluate(expression, { user: { name: 'Alice', age: 25 } });
    const deps = evaluator.getDependencies(expression);
    
    expect(deps).toEqual(['user']);
  });

  it('should clear cache', () => {
    const evaluator = new ExpressionEvaluator();
    const expression = 'x + y';
    
    evaluator.evaluate(expression, { x: 1, y: 2 });
    evaluator.clearCache();
    
    const deps = evaluator.getDependencies(expression);
    expect(deps).toEqual(['x', 'y']);
  });
});