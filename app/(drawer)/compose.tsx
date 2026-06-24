// SPDX-License-Identifier: GPL-3.0-or-later
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Snackbar,
  Divider,
  Chip,
  IconButton,
  ActivityIndicator,
  Dialog,
  Portal,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';

import { usePostStore } from '../../src/store/postStore';
import { usePostEditor } from '../../src/hooks/usePostEditor';
import { TagChipList } from '../../src/components/TagChipList';
import { MarkdownPreview } from '../../src/components/MarkdownPreview';
import { ImagePickerButton } from '../../src/components/ImagePickerButton';
import { FeatureImagePicker } from '../../src/components/FeatureImagePicker';

export default function ComposeScreen(): React.JSX.Element {
  const router = useRouter();
  const {
    currentPost,
    setTitle,
    setMarkdownContent,
    setTags,
    resetCurrentPost,
    deletePost,
    clearError,
  } = usePostStore();

  const { isDirty, isEditMode, originalStatus, isSaving, error, handleSave, confirmLeaveIfDirty } =
    usePostEditor();

  const { colors } = useTheme();

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const title = currentPost?.title ?? '';
  const content = currentPost?.markdownContent ?? '';
  const tags = currentPost?.tags ?? [];
  const ghostId = currentPost?.ghostId;

  function handleTitleChange(value: string): void {
    setTitle(value);
    if (titleError) setTitleError(null);
  }

  function handleImageInsert(markdown: string): void {
    setMarkdownContent(content + markdown);
  }

  async function onPressSaveDraft(): Promise<void> {
    const success = await handleSave('draft', (msg) => {
      if (msg.includes('titre')) setTitleError(msg);
      else setSnackbarMessage(msg);
    });
    if (success) setSnackbarMessage('Brouillon sauvegardé.');
  }

  async function onPressPublish(): Promise<void> {
    const success = await handleSave('published', (msg) => {
      if (msg.includes('titre')) setTitleError(msg);
      else setSnackbarMessage(msg);
    });
    if (success) setSnackbarMessage('Article publié.');
  }

  async function onPressDepublish(): Promise<void> {
    const success = await handleSave('draft', (msg) => {
      if (msg.includes('titre')) setTitleError(msg);
      else setSnackbarMessage(msg);
    });
    if (success) setSnackbarMessage('Article dépublié.');
  }

  function onPressReset(): void {
    confirmLeaveIfDirty(() => {
      resetCurrentPost();
      setIsPreviewMode(false);
      setTitleError(null);
    });
  }

  async function handleConfirmDelete(): Promise<void> {
    setShowDeleteDialog(false);
    if (!ghostId) return;
    try {
      await deletePost(ghostId);
      resetCurrentPost();
      router.replace('/(drawer)/posts');
    } catch {
      setSnackbarMessage('Impossible de supprimer le post.');
    }
  }

  const isPublished = originalStatus === 'published';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={96}
    >
      {isEditMode && (
        <View style={styles.editBanner}>
          <Chip
            compact
            icon={isPublished ? 'eye' : 'pencil'}
            style={[styles.editChip, { backgroundColor: colors.primary + '22' }]}
          >
            {isPublished ? 'Édition — publié' : 'Édition — brouillon'}
          </Chip>
          {isDirty && (
            <Chip
              compact
              icon="circle-small"
              style={[styles.dirtyChip, { backgroundColor: colors.primaryContainer }]}
              textStyle={[styles.dirtyChipText, { color: colors.onPrimaryContainer }]}
            >
              Modifié
            </Chip>
          )}
        </View>
      )}

      <View style={[styles.toolbar, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.toolbarLeft}>
          <IconButton
            icon={isPreviewMode ? 'pencil-outline' : 'eye-outline'}
            iconColor={colors.onSurfaceVariant}
            size={22}
            onPress={() => setIsPreviewMode((prev) => !prev)}
            accessibilityLabel={isPreviewMode ? 'Passer en mode édition' : 'Aperçu'}
          />
          <ImagePickerButton onInsert={handleImageInsert} disabled={isSaving} />
        </View>
        <View style={styles.toolbarRight}>
          {isEditMode && ghostId && (
            <IconButton
              icon="delete-outline"
              iconColor={colors.error}
              size={22}
              onPress={() => setShowDeleteDialog(true)}
              disabled={isSaving}
              accessibilityLabel="Supprimer le post"
            />
          )}
          {isEditMode && (
            <IconButton
              icon="refresh"
              iconColor={colors.onSurfaceVariant}
              size={22}
              onPress={onPressReset}
              accessibilityLabel="Annuler les modifications"
            />
          )}
        </View>
      </View>
      <Divider />

      {isPreviewMode ? (
        <MarkdownPreview markdown={content} />
      ) : (
        <View style={styles.editorBody}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.editorMeta}
          >
            <FeatureImagePicker disabled={isSaving} />

            <TextInput
              label="Titre"
              value={title}
              onChangeText={handleTitleChange}
              mode="outlined"
              error={!!titleError}
              style={styles.titleInput}
              disabled={isSaving}
              returnKeyType="next"
            />
            {titleError && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{titleError}</Text>
            )}

            <TagChipList
              tags={tags}
              onTagsChange={setTags}
              disabled={isSaving}
            />
          </ScrollView>

          <TextInput
            label="Contenu (Markdown)"
            value={content}
            onChangeText={setMarkdownContent}
            mode="outlined"
            multiline
            scrollEnabled
            style={styles.contentInput}
            disabled={isSaving}
            textAlignVertical="top"
          />
        </View>
      )}

      <Divider />
      <View style={[styles.actions, { backgroundColor: colors.surface }]}>
        {isSaving ? (
          <ActivityIndicator style={styles.activityIndicator} />
        ) : isPublished ? (
          <>
            <Button mode="outlined" onPress={onPressDepublish} disabled={isSaving} style={styles.actionButton}>
              Dépublier
            </Button>
            <Button mode="contained" onPress={onPressPublish} disabled={isSaving} style={styles.actionButton}>
              Sauvegarder
            </Button>
          </>
        ) : (
          <>
            <Button mode="outlined" onPress={onPressSaveDraft} disabled={isSaving} style={styles.actionButton}>
              Brouillon
            </Button>
            <Button mode="contained" onPress={onPressPublish} disabled={isSaving} style={styles.actionButton}>
              Publier
            </Button>
          </>
        )}
      </View>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Supprimer le post</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Supprimer « {title || '(Sans titre)'} » définitivement ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button textColor={colors.error} onPress={handleConfirmDelete}>
              Supprimer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!error || !!snackbarMessage}
        onDismiss={() => { if (error) clearError(); else setSnackbarMessage(null); }}
        duration={error ? 4000 : 3500}
        action={{ label: 'OK', onPress: () => { if (error) clearError(); else setSnackbarMessage(null); } }}
      >
        {error ?? snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  editChip: {},
  dirtyChip: {},
  dirtyChipText: {
    fontSize: 11,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorBody: {
    flex: 1,
  },
  editorMeta: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  titleInput: {
    backgroundColor: 'transparent',
  },
  contentInput: {
    backgroundColor: 'transparent',
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 120,
  },
  fieldError: {
    fontSize: 12,
    marginTop: -8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    flex: 1,
  },
  activityIndicator: {
    flex: 1,
    paddingVertical: 8,
  },
});
