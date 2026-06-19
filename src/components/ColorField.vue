<script setup>
/* Campo de cor reutilizável: seletor visual + entrada hexadecimal manual.
   Usa o estilo "join" do DaisyUI. */
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: String, required: true },
  label: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const value = computed(() => props.modelValue);

function setColor(ev) {
  emit("update:modelValue", ev.target.value);
}
function setHex(ev) {
  let v = ev.target.value.trim();
  if (v && v[0] !== "#") v = "#" + v;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
    emit("update:modelValue", v.toLowerCase());
  }
}
</script>

<template>
  <label class="flex flex-col w-full" :class="{ 'opacity-40 pointer-events-none': disabled }">
    <span v-if="label" class="mb-1 text-xs font-medium opacity-70">{{ label }}</span>
    <div class="join w-full">
      <span class="join-item flex items-center border border-base-300 bg-base-200 px-1.5 rounded-l-lg">
        <input
          type="color"
          class="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
          :value="value"
          @input="setColor"
        />
      </span>
      <input
        type="text"
        class="input input-sm join-item w-full font-mono uppercase tracking-wide"
        :value="value"
        maxlength="7"
        spellcheck="false"
        @input="setHex"
      />
    </div>
  </label>
</template>
