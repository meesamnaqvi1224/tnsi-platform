import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { LEVELS, LEVEL_IDS, type LevelId } from '@tnsi/core';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import { colors, radius, spacing } from '@/theme';
import type { ReturnPathContent } from '@/api/types';
import type { ReturnPathSettings } from '@/lib/return-path/settings';
import { LabyrinthThumb } from './LabyrinthThumb';
import { rp } from './palette';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

function SettingToggle({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <ThemedText variant="body" style={styles.settingLabel}>
          {label}
        </ThemedText>
        <ThemedText variant="caption" color={colors.charcoal}>
          {help}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: rp.channel, true: rp.trace }}
        thumbColor={colors.white}
      />
    </View>
  );
}

/** The introduction: what to do, Begin, the two settings and the safety note. */
export function IntroScreen({
  content,
  settings,
  settingsOpen,
  onToggleSettings,
  onChangeSettings,
  onBegin,
}: {
  content: ReturnPathContent;
  settings: ReturnPathSettings;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onChangeSettings: (patch: Partial<ReturnPathSettings>) => void;
  onBegin: () => void;
}) {
  const { intro } = content;
  return (
    <View style={styles.stack}>
      <View style={styles.list}>
        {intro.instructions.map((instruction) => (
          <View key={instruction} style={styles.listRow}>
            <ThemedText variant="body" color={colors.bronze}>
              ·
            </ThemedText>
            <ThemedText variant="body" style={styles.listText}>
              {instruction}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <PrimaryButton label={intro.beginLabel} onPress={onBegin} style={styles.flexButton} />
        <PrimaryButton
          label="Settings"
          variant="secondary"
          onPress={onToggleSettings}
          style={styles.flexButton}
        />
      </View>

      {settingsOpen ? (
        <Card>
          <View style={styles.settingsStack}>
            <SettingToggle
              label={content.settings.gentlePauseLabel}
              help={content.settings.gentlePauseHelp}
              value={settings.pause}
              onChange={(pause) => onChangeSettings({ pause })}
            />
            <SettingToggle
              label={content.settings.noBreathLabel}
              help={content.settings.noBreathHelp}
              value={settings.noBreath}
              onChange={(noBreath) => onChangeSettings({ noBreath })}
            />
          </View>
        </Card>
      ) : null}

      <ThemedText variant="caption" color={colors.charcoal}>
        {intro.safetyNote}
      </ThemedText>
    </View>
  );
}

/** Choose a labyrinth. A level this member may not start is marked and explains why when tapped. */
export function ChooseScreen({
  content,
  allowedLevels,
  lockedLevel,
  onBack,
  onChoose,
  onLearnMore,
}: {
  content: ReturnPathContent;
  allowedLevels: LevelId[];
  lockedLevel: LevelId | null;
  onBack: () => void;
  onChoose: (level: LevelId) => void;
  onLearnMore: () => void;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.chooseHeader}>
        <ThemedText variant="heading" style={styles.flexText}>
          {content.choose.heading}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={8}
          style={styles.backButton}
        >
          <ThemedText variant="body" color={colors.charcoal}>
            Back
          </ThemedText>
        </Pressable>
      </View>

      {LEVEL_IDS.map((id) => {
        const config = LEVELS[id];
        const locked = !allowedLevels.includes(id);
        const tag = locked ? 'Members' : id === 1 ? 'Free' : 'Included';
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${config.name}. ${config.subtitle}. ${config.time}. ${tag}.`}
            onPress={() => onChoose(id)}
            style={({ pressed }) => [pressed && styles.pressed, locked && styles.lockedRow]}
          >
            <Card style={styles.levelCard}>
              <LabyrinthThumb level={id} size={64} />
              <View style={styles.levelText}>
                <ThemedText variant="heading">{config.name}</ThemedText>
                <ThemedText variant="caption" color={colors.charcoal}>
                  {config.subtitle} · {config.time}
                </ThemedText>
              </View>
              <View style={[styles.tag, locked && styles.tagLocked]}>
                <ThemedText variant="caption" color={locked ? colors.charcoal : rp.trace}>
                  {tag}
                </ThemedText>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {lockedLevel ? (
        <Card>
          <ThemedText variant="body" accessibilityLiveRegion="polite" style={styles.lockedMessage}>
            {content.choose.lockedMessage.replace('{level}', LEVELS[lockedLevel].name)}
          </ThemedText>
          <PrimaryButton
            label={content.choose.lockedLinkLabel}
            variant="secondary"
            onPress={onLearnMore}
          />
        </Card>
      ) : null}
    </View>
  );
}

/** The ending: a moment to notice, then what to do next. Nothing here scores or judges the practice. */
export function EndScreen({
  content,
  saveState,
  onPractiseAgain,
  onTryAnother,
  onAssessment,
  onHome,
}: {
  content: ReturnPathContent;
  saveState: SaveState;
  onPractiseAgain: () => void;
  onTryAnother: () => void;
  onAssessment: () => void;
  onHome: () => void;
}) {
  const { ending } = content;
  const status =
    saveState === 'saved'
      ? ` · ${ending.memberSavedLabel}`
      : saveState === 'saving'
        ? ' · Saving…'
        : '';
  return (
    <View style={styles.stack}>
      <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
        {ending.eyebrow}
        {status}
      </ThemedText>
      <ThemedText variant="heading" accessibilityLiveRegion="polite">
        {ending.heading}
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal}>
        {ending.line}
      </ThemedText>

      {saveState === 'failed' ? (
        <ThemedText variant="caption" color={colors.error} accessibilityLiveRegion="polite">
          {ending.memberSaveFailedLabel}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label={ending.assessmentLabel} onPress={onAssessment} />
        <PrimaryButton
          label={ending.practiseAgainLabel}
          variant="secondary"
          onPress={onPractiseAgain}
        />
        <PrimaryButton label={ending.tryAnotherLabel} variant="secondary" onPress={onTryAnother} />
        <PrimaryButton label={ending.backToDashboardLabel} variant="secondary" onPress={onHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listText: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  settingsStack: {
    gap: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontWeight: '600',
  },
  chooseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  flexText: {
    flex: 1,
  },
  backButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  levelText: {
    flex: 1,
    gap: 2,
  },
  tag: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: rp.centreFill,
  },
  tagLocked: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  lockedRow: {
    opacity: 0.75,
  },
  lockedMessage: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  actions: {
    gap: spacing.sm,
  },
});
