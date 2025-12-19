<template>
  <div class="w-80 bg-slate-50 text-slate-900 p-4 font-sans text-sm">
    <header class="flex justify-between items-center mb-4">
      <h1 class="text-lg font-bold text-indigo-700">Auto Paginator</h1>

      <div 
        @click="toggleEnabled"
        class="cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        :class="settings.enabled ? 'bg-indigo-600' : 'bg-gray-200'"
      >
        <span 
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="settings.enabled ? 'translate-x-6' : 'translate-x-1'"
        />
      </div>
    </header>

    <div v-if="!settings.enabled" class="bg-yellow-100 text-yellow-800 p-2 rounded mb-4 text-center">
      Extension is disabled globally.
    </div>

    <div class="mb-4 text-center">
      <p v-if="currentDomain" class="text-gray-600 mb-2">Current: <span class="font-mono text-xs">{{ currentDomain }}</span></p>

      <button 
        v-if="currentDomain && !settings.blacklist.includes(currentDomain)"
        @click="addToBlacklist"
        class="text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded"
      >
        Disable on this site
      </button>

      <p v-else-if="currentDomain" class="text-xs text-red-600 font-semibold">
        Disabled on this site
      </p>
    </div>

    <hr class="border-gray-200 mb-4" />

    <div class="text-center">
      <button @click="showBlacklist = !showBlacklist" class="text-indigo-600 hover:underline text-xs">
        {{ showBlacklist ? 'Hide Settings' : 'Manage Blacklist' }}
      </button>
    </div>

    <div v-if="showBlacklist" class="mt-4">
      <p class="mb-1 text-xs text-gray-500">Blacklisted Domains (one per line):</p>

      <textarea 
        v-model="blacklistInput" 
        class="w-full text-xs p-2 border rounded h-32 font-mono"
        placeholder="example.com"
      ></textarea>

      <button 
        @click="saveBlacklist"
        class="mt-2 w-full bg-indigo-600 text-white py-1 rounded hover:bg-indigo-700"
      >
        Save Blacklist
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch, toRaw } from 'vue';
  import { storage, type AppSettings } from '../utils/storage';

  const settings = ref<AppSettings>({ enabled: true, blacklist: [] });
  const currentDomain = ref('');
  const showBlacklist = ref(false);
  const blacklistInput = ref('');

  onMounted(async () => {
    settings.value = await storage.get();
    blacklistInput.value = settings.value.blacklist.join('\n');
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url) {
      try {
        currentDomain.value = new URL(tabs[0].url).hostname;
      } catch {
      }
    }
  });

  watch(settings, (newVal) => {
    storage.set(toRaw(newVal));
  }, { deep: true });

  function toggleEnabled() {
    settings.value.enabled = !settings.value.enabled;
  }

  function saveBlacklist() {
    const domains = blacklistInput.value.split('\n').map(s => s.trim()).filter(Boolean);
    settings.value.blacklist = domains;
    showBlacklist.value = false;
  }

  function addToBlacklist() {
    if (currentDomain.value && !settings.value.blacklist.includes(currentDomain.value)) {
      settings.value.blacklist.push(currentDomain.value);
      blacklistInput.value = settings.value.blacklist.join('\n');
    }
  }
</script>
