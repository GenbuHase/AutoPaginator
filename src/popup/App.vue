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

    <!-- Main View -->
    <div v-if="!editingSite" class="space-y-4">
      <div class="text-center">
        <p v-if="currentDomain" class="text-gray-600 mb-2">Current Page: <span class="font-mono text-xs">{{ currentDomain }}</span></p>
        <div class="flex justify-center gap-2">
          <button 
            @click="addToBlacklist"
            class="text-xs py-1 px-2 rounded"
            :class="isCurrentBlacklisted ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'"
          >
            {{ isCurrentBlacklisted ? 'Blacklisted' : 'Disable on this site' }}
          </button>
        </div>
      </div>

      <hr class="border-gray-200" />

      <div class="flex justify-center gap-4">
        <button @click="toggleBlacklist" class="text-indigo-600 hover:underline text-xs">
          {{ showBlacklistManager ? 'Hide List' : 'Blacklist' }}
        </button>
        <button @click="toggleSiteInfoManager" class="text-indigo-600 hover:underline text-xs">
          {{ showSiteInfoManager ? 'Hide Manager' : 'SITEINFO' }}
        </button>
        <button @click="exportData" class="text-indigo-600 hover:underline text-xs">Export</button>
        <button @click="importData" class="text-indigo-600 hover:underline text-xs">Import</button>
      </div>

      <!-- Blacklist Manager -->
      <div v-if="showBlacklistManager" class="mt-4">
        <p class="mb-1 text-xs text-gray-500">Blacklisted Domains:</p>
        <textarea 
          v-model="blacklistInput" 
          class="w-full text-xs p-2 border rounded h-24 font-mono mb-2"
          placeholder="example.com"
        ></textarea>
        <button 
          @click="saveBlacklist"
          class="w-full bg-indigo-600 text-white py-1 rounded hover:bg-indigo-700 text-xs"
        >
          Update Blacklist
        </button>
      </div>

      <!-- SITEINFO Manager List -->
      <div v-if="showSiteInfoManager" class="mt-4 bg-white p-3 rounded border shadow-inner max-h-80 overflow-y-auto">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-xs text-indigo-700">SITEINFO List</h3>
          <button @click="startAdding" class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200">
            + Add New
          </button>
        </div>

        <div v-if="settings.siteInfo.length === 0" class="text-xs text-gray-400 text-center py-4">
          No configurations found.
        </div>

        <div v-for="(config, index) in settings.siteInfo" :key="index" class="mb-2 p-2 border rounded hover:bg-gray-50 group">
          <div class="flex justify-between items-center">
            <div class="truncate pr-2">
              <div class="font-bold text-xs truncate">{{ config.name }}</div>
              <div class="text-[10px] text-gray-500 font-mono truncate">{{ config.url }}</div>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="editSite(index)" class="text-indigo-600 hover:text-indigo-800">Edit</button>
              <button @click="deleteSiteConfig(index)" class="text-red-600 hover:text-red-800">Del</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Add Form -->
    <div v-else class="space-y-3">
      <h2 class="font-bold text-indigo-800 text-center">{{ editingIndex === -1 ? 'Add New SITEINFO' : 'Edit SITEINFO' }}</h2>
      
      <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">Name</label>
          <input v-model="form.name" type="text" placeholder="e.g., Blog Next Page" class="w-full p-2 border rounded" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">URL (Regex)</label>
          <input v-model="form.url" type="text" placeholder="^https://blog\.com/.*" class="w-full p-2 border rounded font-mono" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">Example URL</label>
          <input v-model="form.exampleUrl" type="text" placeholder="https://blog.com/page1" class="w-full p-2 border rounded text-xs" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">Page Element (XPath)</label>
          <input v-model="form.pageElement" type="text" placeholder="//div[@id='main']" class="w-full p-2 border rounded font-mono" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">Next Link (XPath)</label>
          <input v-model="form.nextLink" type="text" placeholder="//a[@class='next']" class="w-full p-2 border rounded font-mono" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">Insert Before (XPath, optional)</label>
          <input v-model="form.insertBefore" type="text" placeholder="//div[@id='footer']" class="w-full p-2 border rounded font-mono text-xs" />
        </div>
      </div>

      <div class="flex gap-2">
        <button @click="editingSite = false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300">Cancel</button>
        <button @click="saveForm" class="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch, toRaw, computed } from 'vue';
  import { storage, type AppSettings, type SiteConfig } from '../utils/storage';

  const settings = ref<AppSettings>({ enabled: true, blacklist: [], siteInfo: [] });
  const currentDomain = ref('');
  const showBlacklistManager = ref(false);
  const showSiteInfoManager = ref(false);
  const blacklistInput = ref('');
  
  // Editing state
  const editingSite = ref(false);
  const editingIndex = ref(-1);
  const form = ref<SiteConfig>({
    name: '',
    url: '',
    exampleUrl: '',
    pageElement: '',
    nextLink: '',
    insertBefore: ''
  });

  const isCurrentBlacklisted = computed(() => {
    return currentDomain.value && settings.value.blacklist.includes(currentDomain.value);
  });

  onMounted(async () => {
    await loadSettings();
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url) {
      try {
        currentDomain.value = new URL(tabs[0].url).hostname;
      } catch {}
    }
  });

  async function loadSettings() {
    settings.value = await storage.get();
    blacklistInput.value = settings.value.blacklist.join('\n');
  }

  watch(settings, (newVal) => {
    storage.set(toRaw(newVal));
  }, { deep: true });

  function toggleEnabled() {
    settings.value.enabled = !settings.value.enabled;
  }

  function toggleBlacklist() {
    showBlacklistManager.value = !showBlacklistManager.value;
    if (showBlacklistManager.value) showSiteInfoManager.value = false;
  }

  function toggleSiteInfoManager() {
    showSiteInfoManager.value = !showSiteInfoManager.value;
    if (showSiteInfoManager.value) showBlacklistManager.value = false;
  }

  function saveBlacklist() {
    const domains = blacklistInput.value.split('\n').map(s => s.trim()).filter(Boolean);
    settings.value.blacklist = domains;
    showBlacklistManager.value = false;
  }

  function addToBlacklist() {
    if (currentDomain.value) {
      if (isCurrentBlacklisted.value) {
        settings.value.blacklist = settings.value.blacklist.filter(d => d !== currentDomain.value);
      } else {
        settings.value.blacklist.push(currentDomain.value);
      }
      blacklistInput.value = settings.value.blacklist.join('\n');
    }
  }

  // Form handling
  function startAdding() {
    editingIndex.value = -1;
    form.value = {
      name: '',
      url: `^https?://${currentDomain.value}/.*`,
      exampleUrl: '',
      pageElement: '',
      nextLink: '',
      insertBefore: ''
    };
    editingSite.value = true;
  }

  function editSite(index: number) {
    editingIndex.value = index;
    const config = settings.value.siteInfo[index];
    if (config) {
      form.value = {
        name: config.name,
        url: config.url,
        exampleUrl: config.exampleUrl || '',
        pageElement: config.pageElement,
        nextLink: config.nextLink,
        insertBefore: config.insertBefore || ''
      };
      editingSite.value = true;
    }
  }

  function saveForm() {
    const newConfig = { ...form.value };
    if (!newConfig.name || !newConfig.url || !newConfig.pageElement || !newConfig.nextLink) {
      alert("Please fill in required fields (Name, URL, Page Element, Next Link)");
      return;
    }

    if (editingIndex.value === -1) {
      settings.value.siteInfo.push(newConfig);
    } else {
      settings.value.siteInfo[editingIndex.value] = newConfig;
    }
    editingSite.value = false;
  }

  function deleteSiteConfig(index: number) {
    if (confirm("Delete this configuration?")) {
      settings.value.siteInfo.splice(index, 1);
    }
  }

  async function exportData() {
    const json = await storage.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autopaginator_settings_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const success = await storage.import(text);
      if (success) {
        alert('Settings imported successfully!');
        await loadSettings();
      } else {
        alert('Failed to import settings. Invalid file format.');
      }
    };
    input.click();
  }
</script>
