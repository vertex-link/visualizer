<template>
  <div class="outliner">
    <div class="outliner-header">
      <span class="outliner-title">Scene Outliner</span>
      <div class="outliner-actions">
        <button @click="createActor">+ Actor</button>
      </div>
    </div>

    <ul v-if="actors.length > 0" class="actor-list">
      <li
        v-for="actor in actors"
        :key="actor.id"
        :class="['actor-item', { selected: selectedActorId === actor.id }]"
        @click="selectActor(actor.id)"
      >
        <div class="actor-item-label">
          <span class="actor-icon">📦</span>
          <span>{{ actor.label }}</span>
        </div>
      </li>
    </ul>

    <div v-else class="empty-state">
      <p>No actors in scene</p>
      <p>Click "+ Actor" to create one</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface Actor {
  id: string;
  label: string;
  components: any[];
}

const actors = ref<Actor[]>([]);
const selectedActorId = ref<string | null>(null);
let cleanupListener: (() => void) | null = null;

onMounted(async () => {
  // Get initial scene
  const scene = await window.electronAPI.getScene();
  if (scene && scene.actors) {
    actors.value = scene.actors;
  }

  // Listen for editor events
  cleanupListener = window.electronAPI.onEditorEvent((event) => {
    console.log("Outliner received event:", event.type);

    if (event.type === "core.entity.created") {
      actors.value.push(event.payload.entity);
    }

    if (event.type === "core.entity.destroyed") {
      actors.value = actors.value.filter(
        (a) => a.id !== event.payload.entity.id
      );
    }

    if (event.type === "editor.selection.changed") {
      selectedActorId.value = event.payload.actorId;
    }
  });
});

onUnmounted(() => {
  if (cleanupListener) {
    cleanupListener();
  }
});

function createActor() {
  window.electronAPI.sendCommand({
    type: "actor/create",
    label: `Actor ${actors.value.length + 1}`,
  });
}

function selectActor(actorId: string) {
  window.electronAPI.sendCommand({
    type: "selection/set",
    actorId,
  });
}
</script>
