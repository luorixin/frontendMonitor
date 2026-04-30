<script setup lang="ts">
import { captureError, getOptions, track } from "frontend-monitor-core"
import { ref } from "vue"

const count = ref(0)
const lastAction = ref("waiting")

function sendCustomEvent(): void {
  track("nuxt3.example.custom", {
    count: count.value
  }, true)
  lastAction.value = "sent custom track event"
}

function sendManualError(): void {
  captureError(new Error("Nuxt3 manual error"), {
    source: "button"
  }, true)
  lastAction.value = "sent manual error"
}

function triggerVueError(): void {
  lastAction.value = "throwing component error"
  throw new Error("Nuxt3 component error example")
}

function bumpCount(): void {
  count.value += 1
  lastAction.value = `count=${count.value}`
}
</script>

<template>
  <main class="shell">
    <section class="panel hero">
      <p class="eyebrow">Nuxt 3 Adapter</p>
      <h1>frontend-monitor Nuxt 3 example</h1>
      <p class="lede">
        这个示例演示 `frontend-monitor-nuxt3` module 如何在 Nuxt client plugin 里自动接入。
      </p>
    </section>

    <section class="panel controls">
      <button @click="sendCustomEvent">Track custom event</button>
      <button @click="sendManualError">Capture manual error</button>
      <button @click="bumpCount">Change state</button>
      <button @click="triggerVueError">Throw Vue error</button>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>Runtime state</h2>
        <pre>{{ JSON.stringify(getOptions(), null, 2) }}</pre>
      </article>
      <article class="panel">
        <h2>UI state</h2>
        <pre>{{ JSON.stringify({ count, lastAction }, null, 2) }}</pre>
      </article>
    </section>
  </main>
</template>

<style>
:root {
  color: #edf1ff;
  font-family: "IBM Plex Sans", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(143, 211, 255, 0.16), transparent 28%),
    linear-gradient(135deg, #09111c, #101f37 56%, #17324b);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button {
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  padding: 12px 14px;
}

.shell {
  margin: 0 auto;
  max-width: 1040px;
  padding: 40px 20px 64px;
}

.panel {
  backdrop-filter: blur(14px);
  background: rgba(9, 17, 28, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.28);
  padding: 20px;
}

.hero {
  margin-bottom: 18px;
}

.eyebrow {
  color: #8fd3ff;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  margin: 0 0 10px;
  text-transform: uppercase;
}

.hero h1,
h2 {
  margin: 0 0 12px;
}

.lede {
  color: #b5c2db;
  line-height: 1.7;
  margin: 0;
}

.controls {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-bottom: 18px;
}

.controls button {
  background: linear-gradient(135deg, #8fd3ff, #79e4ba);
  color: #10243d;
}

.grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

pre {
  background: rgba(2, 8, 20, 0.88);
  border-radius: 16px;
  color: #93f5c7;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.84rem;
  line-height: 1.5;
  margin: 0;
  min-height: 220px;
  overflow: auto;
  padding: 14px;
  white-space: pre-wrap;
}
</style>
