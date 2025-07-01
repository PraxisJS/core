import { performance } from 'perf_hooks';
import { signal, effect, computed } from '../dist/praxis.esm.js';

class Benchmark {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  run(fn, iterations = 1000) {
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    
    const end = performance.now();
    const duration = end - start;
    
    this.results.push({
      iterations,
      duration,
      avgDuration: duration / iterations
    });
    
    return duration;
  }

  report() {
    console.log(`\n=== ${this.name} ===`);
    this.results.forEach((result, index) => {
      console.log(`Run ${index + 1}: ${result.iterations} iterations in ${result.duration.toFixed(2)}ms (${result.avgDuration.toFixed(4)}ms avg)`);
    });
  }
}

function benchmarkSignalCreation() {
  const bench = new Benchmark('Signal Creation');
  
  bench.run(() => {
    const s = signal(Math.random());
  }, 10000);
  
  bench.report();
}

function benchmarkSignalUpdates() {
  const bench = new Benchmark('Signal Updates');
  const s = signal(0);
  
  bench.run(() => {
    s.value = Math.random();
  }, 10000);
  
  bench.report();
}

function benchmarkEffectCreation() {
  const bench = new Benchmark('Effect Creation');
  const s = signal(0);
  
  bench.run(() => {
    const dispose = effect(() => {
      s.value;
    });
    dispose();
  }, 1000);
  
  bench.report();
}

function benchmarkComputedSignals() {
  const bench = new Benchmark('Computed Signals');
  const a = signal(1);
  const b = signal(2);
  
  bench.run(() => {
    const c = computed(() => a.value + b.value);
    c.value;
  }, 5000);
  
  bench.report();
}

function benchmarkDeepReactivity() {
  const bench = new Benchmark('Deep Reactivity Chain');
  
  const s1 = signal(1);
  const s2 = computed(() => s1.value * 2);
  const s3 = computed(() => s2.value + 10);
  const s4 = computed(() => s3.value / 2);
  const s5 = computed(() => s4.value * 3);
  
  bench.run(() => {
    s1.value = Math.random() * 100;
    s5.value;
  }, 5000);
  
  bench.report();
}

function benchmarkManySignals() {
  const bench = new Benchmark('Many Signals Update');
  
  const signals = Array.from({ length: 1000 }, () => signal(0));
  
  bench.run(() => {
    signals.forEach((s, i) => {
      s.value = i;
    });
  }, 100);
  
  bench.report();
}

function benchmarkManyEffects() {
  const bench = new Benchmark('Many Effects');
  
  const s = signal(0);
  const effects = [];
  
  for (let i = 0; i < 1000; i++) {
    effects.push(effect(() => {
      s.value;
    }));
  }
  
  bench.run(() => {
    s.value = Math.random();
  }, 100);
  
  effects.forEach(eff => eff.dispose());
  bench.report();
}

async function runBenchmarks() {
  console.log('🚀 Running PraxisJS Performance Benchmarks');
  console.log('==========================================');
  
  benchmarkSignalCreation();
  benchmarkSignalUpdates();
  benchmarkEffectCreation();
  benchmarkComputedSignals();
  benchmarkDeepReactivity();
  benchmarkManySignals();
  benchmarkManyEffects();
  
  console.log('\n✅ Benchmarks completed!');
  console.log('\nNote: These benchmarks test PraxisJS core reactivity performance.');
  console.log('For DOM manipulation comparisons with Alpine.js, run the HTML benchmarks.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error);
}