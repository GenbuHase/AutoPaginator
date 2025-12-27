<template>
  <div class="w-80 bg-slate-50 text-slate-900 p-4 font-sans text-sm">
    <header class="flex justify-between items-center mb-4">
      <h1 class="text-lg font-bold text-indigo-700">{{ $t("title") }}</h1>

      <div @click="toggleEnabled" class="cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" :class="settings.enabled ? 'bg-indigo-600' : 'bg-gray-200'">
        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="settings.enabled ? 'translate-x-6' : 'translate-x-1'" />
      </div>
    </header>

    <div v-if="!settings.enabled" class="bg-yellow-100 text-yellow-800 p-2 rounded mb-4 text-center">{{ $t("extensionDisabled") }}</div>

    <!-- Main View -->
    <div v-if="!editingSite" class="space-y-4">
      <div class="text-center">
        <p v-if="currentDomain" class="text-gray-600 mb-2">
          {{ $t("currentPage") }} <span class="font-mono text-xs">{{ currentDomain }}</span>
        </p>
        <div class="flex justify-center gap-2">
          <button @click="addToBlacklist" class="text-xs py-1 px-2 rounded" :class="isCurrentBlacklisted ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'">
            {{ isCurrentBlacklisted ? $t("blacklisted") : $t("disableOnSite") }}
          </button>
        </div>
      </div>

      <hr class="border-gray-200" />

      <div class="flex justify-center gap-4">
        <button @click="toggleBlacklist" class="text-indigo-600 hover:underline text-xs">
          {{ showBlacklistManager ? $t("hideList") : $t("blacklist") }}
        </button>
        <button @click="toggleSiteInfoManager" class="text-indigo-600 hover:underline text-xs">
          {{ showSiteInfoManager ? $t("hideManager") : $t("siteInfo") }}
        </button>
        <button @click="exportData" class="text-indigo-600 hover:underline text-xs">{{ $t("export") }}</button>
        <button @click="importData" class="text-indigo-600 hover:underline text-xs">{{ $t("import") }}</button>
      </div>

      <!-- Blacklist Manager -->
      <div v-if="showBlacklistManager" class="mt-4">
        <p class="mb-1 text-xs text-gray-500">{{ $t("blacklistedDomains") }}</p>
        <textarea v-model="blacklistInput" class="w-full text-xs p-2 border rounded h-24 font-mono mb-2" placeholder="example.com"></textarea>
        <button @click="saveBlacklist" class="w-full bg-indigo-600 text-white py-1 rounded hover:bg-indigo-700 text-xs">{{ $t("updateBlacklist") }}</button>
      </div>

      <!-- SITEINFO Manager List -->
      <div v-if="showSiteInfoManager" class="mt-4 bg-white p-3 rounded border shadow-inner max-h-80 overflow-y-auto">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-xs text-indigo-700">{{ $t("siteInfoList") }}</h3>
          <button @click="startAdding" class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200">{{ $t("addNew") }}</button>
        </div>

        <div v-if="settings.siteInfo.length === 0" class="text-xs text-gray-400 text-center py-4">{{ $t("noConfigs") }}</div>

        <div
          v-for="(config, index) in settings.siteInfo"
          :key="index"
          class="mb-2 p-2 border rounded hover:bg-gray-50 group relative cursor-move flex items-center gap-2"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover.prevent="handleDragOver(index)"
          @drop="handleDrop"
          :class="{
            'opacity-50 border-indigo-400 border-dashed bg-indigo-50': draggedIndex === index,
            'bg-gray-100 opacity-75': !config.enabled
          }">
          <!-- Enable/Disable Toggle -->
          <button @click.stop="config.enabled = !config.enabled" class="w-4 h-4 rounded-full border transition-colors flex-shrink-0" :class="config.enabled ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'" :title="config.enabled ? $t('enabled') : $t('disabled')"></button>

          <div class="flex-1 min-w-0 pointer-events-none">
            <div class="flex items-center gap-1">
              <div class="font-bold text-xs truncate" :class="{ 'line-through text-gray-400': !config.enabled }">{{ config.name }}</div>
            </div>
            <div class="text-[10px] text-gray-500 font-mono truncate">{{ config.url }}</div>
          </div>

          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button @click.stop="editSite(index)" class="text-indigo-600 hover:text-indigo-800 text-xs">{{ $t("edit") }}</button>
            <button @click.stop="deleteSiteConfig(index)" class="text-red-600 hover:text-red-800 text-xs">{{ $t("del") }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Add Form -->
    <div v-else class="space-y-3">
      <h2 class="font-bold text-indigo-800 text-center">{{ editingIndex === -1 ? $t("addSiteInfo") : $t("editSiteInfo") }}</h2>

      <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">{{ $t("name") }}</label>
          <div class="flex gap-2 items-center">
            <input v-model="form.name" type="text" :placeholder="$t('namePlaceholder')" class="flex-1 p-2 border rounded" />
            <label class="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" v-model="form.enabled" />
              <span class="text-[10px] text-gray-600">{{ $t("enabled") }}</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">{{ $t("urlRegex") }}</label>
          <input v-model="form.url" type="text" placeholder="^https://blog\.com/.*" class="w-full p-2 border rounded font-mono" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">{{ $t("exampleUrl") }}</label>
          <input v-model="form.exampleUrl" type="text" placeholder="https://blog.com/page1" class="w-full p-2 border rounded text-xs" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">{{ $t("pageElement") }}</label>
          <input v-model="form.pageElement" type="text" placeholder="//div[@id='main']" class="w-full p-2 border rounded font-mono" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">{{ $t("nextLink") }}</label>
          <input v-model="form.nextLink" type="text" placeholder="//a[@class='next']" class="w-full p-2 border rounded font-mono" />
        </div>
        <div>
          <label class="block text-[11px] text-gray-500 mb-1">{{ $t("insertBefore") }}</label>
          <input v-model="form.insertBefore" type="text" placeholder="//div[@id='footer']" class="w-full p-2 border rounded font-mono text-xs" />
        </div>
      </div>

      <div class="flex gap-2">
        <button @click="editingSite = false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300">{{ $t("cancel") }}</button>
        <button @click="saveForm" class="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">{{ $t("save") }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch, toRaw, computed } from "vue";
  import { storage, type AppSettings, type SiteConfig } from "../utils/storage";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();

  const settings = ref<AppSettings>({ enabled: true, blacklist: [], siteInfo: [] });
  const currentDomain = ref("");
  const showBlacklistManager = ref(false);
  const showSiteInfoManager = ref(false);
  const blacklistInput = ref("");

  // Drag and drop state
  const draggedIndex = ref<number | null>(null);

  // Editing state
  const editingSite = ref(false);
  const editingIndex = ref(-1);
  const form = ref<SiteConfig>({
    name: "",
    url: "",
    enabled: true,
    exampleUrl: "",
    pageElement: "",
    nextLink: "",
    insertBefore: ""
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
      } catch (error) {
        console.debug("Could not parse URL:", error);
      }
    }
  });

  async function loadSettings() {
    settings.value = await storage.get();
    blacklistInput.value = settings.value.blacklist.join("\n");
  }

  watch(
    settings,
    newVal => {
      storage.set(toRaw(newVal));
    },
    { deep: true }
  );

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
    const domains = blacklistInput.value
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
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
      blacklistInput.value = settings.value.blacklist.join("\n");
    }
  }

  // Drag and Drop handlers
  function handleDragStart(index: number) {
    draggedIndex.value = index;
  }

  function handleDragOver(index: number) {
    if (draggedIndex.value === null || draggedIndex.value === index) return;

    // Move item in array while dragging for real-time feedback
    const items = [...settings.value.siteInfo];
    const item = items.splice(draggedIndex.value, 1)[0];
    if (item) {
      items.splice(index, 0, item);
      settings.value.siteInfo = items;
      draggedIndex.value = index;
    }
  }

  function handleDrop() {
    draggedIndex.value = null;
  }

  // Form handling
  function startAdding() {
    editingIndex.value = -1;
    form.value = {
      name: "",
      url: `^https?://${currentDomain.value}/.*`,
      enabled: true,
      exampleUrl: "",
      pageElement: "",
      nextLink: "",
      insertBefore: ""
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
        enabled: config.enabled !== false, // Default to true if somehow missing
        exampleUrl: config.exampleUrl || "",
        pageElement: config.pageElement,
        nextLink: config.nextLink,
        insertBefore: config.insertBefore || ""
      };
      editingSite.value = true;
    }
  }

  function saveForm() {
    const newConfig = { ...form.value };
    if (!newConfig.name || !newConfig.url || !newConfig.pageElement || !newConfig.nextLink) {
      alert(t("alertRequired"));
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
    if (confirm(t("deleteConfirm"))) {
      settings.value.siteInfo.splice(index, 1);
    }
  }

  async function exportData() {
    const json = await storage.export();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autopaginator_settings_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      const text = await file.text();
      const success = await storage.import(text);

      if (success) {
        alert(t("importSuccess"));
        await loadSettings();
      } else {
        alert(t("importFail"));
      }
    };

    input.click();
  }
</script>
