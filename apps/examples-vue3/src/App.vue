<script setup lang="ts">
import { ref } from "vue"
import { captureError, getOptions, track, useWebTracing } from "@frontend-monitor/vue3"

const count = ref(0)
const lastAction = ref("waiting")
const tracing = useWebTracing()

function sendCustomEvent(): void {
  track("vue3.example.custom", {
    count: count.value
  }, true)
  lastAction.value = "sent custom track event"
}

function triggerVueError(): void {
  lastAction.value = "throwing component error"
  throw new Error("Vue3 component error example")
}

function sendManualError(): void {
  captureError(new Error("Vue3 manual error"), {
    source: "button"
  }, true)
  lastAction.value = "sent manual error"
}

function incrementCounter(): void {
  count.value += 1
  tracing.setUser(`vue-user-${count.value}`)
  lastAction.value = `set user vue-user-${count.value}`
}
</script>

<template>
  <main class="shell">
    <section class="panel hero">
      <p class="eyebrow">Vue 3 Adapter</p>
      <h1>frontend-monitor Vue 3 example</h1>
      <p class="lede">
        这个示例演示 `@frontend-monitor/vue3` 插件、`useWebTracing()` 注入和 Vue
        组件错误桥接。
      </p>
    </section>

    <section class="panel controls">
      <button @click="sendCustomEvent">Track custom event</button>
      <button @click="sendManualError">Capture manual error</button>
      <button @click="incrementCounter">Set user via composable</button>
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
