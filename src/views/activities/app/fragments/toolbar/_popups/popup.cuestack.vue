<template>
  <uk-popup
    v-model="state"
    :movable="true"
    :header="{ title: 'Cue Stack' }"
    no-validation
    backdrop
  >
    <div class="cuestack_body">
      <!-- Stack entries table -->
      <div class="stack_table">
        <div class="stack_header">
          <span class="col_num">#</span>
          <span class="col_name">Cue</span>
          <span class="col_group">Group</span>
          <span class="col_time">In</span>
          <span class="col_time">Dwell</span>
          <span class="col_flags">Flags</span>
        </div>
        <div
          v-for="(entry, idx) in entries"
          :key="idx"
          class="stack_row"
          :class="{
            active: idx === pointer,
            skipped: entry.flags.skip,
          }"
          @click="jumpTo(idx)"
        >
          <span class="col_num">{{ entry.order }}</span>
          <span class="col_name">{{ entry.cue ? entry.cue.name : '(missing)' }}</span>
          <span class="col_group">{{ groupName(entry.groupId) }}</span>
          <span class="col_time">{{ entry.inTime !== null ? entry.inTime + 's' : 'auto' }}</span>
          <span class="col_time">{{ entry.dwellTime > 0 ? entry.dwellTime + 's' : 'M' }}</span>
          <span class="col_flags">
            <span v-if="entry.flags.block" title="Block">B</span>
            <span v-if="entry.flags.skip" title="Skip">S</span>
            <span v-if="entry.flags.loop" title="Loop">L</span>
          </span>
        </div>
        <div
          v-if="!entries.length"
          class="empty_hint"
        >
          No cues in stack. Right-click a cue and choose "Add to Stack".
        </div>
      </div>

      <!-- Controls -->
      <div class="stack_controls">
        <uk-button
          label="◀ BACK"
          style="width:100%"
          @click="back"
        />
        <uk-button
          label="STOP"
          color="red"
          style="width:100%"
          @click="stop"
        />
        <uk-button
          label="GO ▶"
          style="width:100%;color:var(--accent-sea-green)"
          @click="go"
        />
      </div>
    </div>
  </uk-popup>
</template>

<script>
import PopupMixin from '@/views/mixins/popup.mixin';

export default {
  name: 'UkPopupCuestack',
  mixins: [PopupMixin],
  compatConfig: { MODE: 3 },
  props: { value: Boolean },
  computed: {
    entries() {
      return this.$show.cueStack.entries;
    },
    pointer() {
      return this.$show.cueStack.pointer;
    },
  },
  methods: {
    go() {
      this.$show.cueStack.go();
    },
    back() {
      this.$show.cueStack.back();
    },
    stop() {
      this.$show.cueStack.stop();
    },
    jumpTo(idx) {
      this.$show.cueStack.jumpTo(idx);
    },
    groupName(groupId) {
      try {
        return this.$show.groupPool.getFromId(groupId)?.name ?? `Group ${groupId}`;
      } catch (_) {
        return `Group ${groupId}`;
      }
    },
  },
};
</script>

<style scoped>
.cuestack_body {
  display: flex;
  flex-direction: column;
  min-height: 300px;
  max-height: 500px;
  width: 540px;
  overflow: hidden;
}
.stack_table {
  flex: 1;
  overflow-y: auto;
  border-bottom: 1px solid var(--primary-dark);
}
.stack_header, .stack_row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  gap: 8px;
  border-bottom: 1px solid var(--primary-dark);
}
.stack_header {
  background: var(--primary-dark);
  font-weight: bold;
  position: sticky;
  top: 0;
}
.stack_row {
  cursor: pointer;
}
.stack_row:hover {
  background: var(--secondary-darker);
}
.stack_row.active {
  background: var(--accent-sea-green-dark, #1a3a2a);
  border-left: 3px solid var(--accent-sea-green);
}
.stack_row.skipped {
  opacity: 0.4;
  text-decoration: line-through;
}
.col_num  { width: 30px; text-align: right; }
.col_name { flex: 1; }
.col_group { width: 100px; }
.col_time { width: 50px; text-align: center; }
.col_flags { width: 50px; text-align: center; letter-spacing: 2px; }
.empty_hint {
  padding: 20px;
  text-align: center;
  color: var(--secondary-lighter);
  opacity: 0.6;
}
.stack_controls {
  display: flex;
  gap: 8px;
  padding: 10px;
}
</style>
