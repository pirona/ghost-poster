/**
 * @file src/components/MarkdownPreview.tsx
 * @description Aperçu du Markdown rendu en HTML dans une WebView sandboxée.
 *              Aucun JavaScript exécuté, aucun lien externe accessible.
 *
 * @exports MarkdownPreview
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { markdownToHtml } from '../utils/contentConverter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkdownPreviewProps {
  markdown: string;
}

// ---------------------------------------------------------------------------
// CSS minimal injecté dans la WebView
// ---------------------------------------------------------------------------

const PREVIEW_CSS = `
  body {
    font-family: -apple-system, system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #212121;
    padding: 16px;
    margin: 0;
  }
  h1, h2, h3, h4 { color: #111; margin-top: 1.2em; }
  h1 { font-size: 1.6em; }
  h2 { font-size: 1.4em; }
  h3 { font-size: 1.2em; }
  a { color: #1565C0; text-decoration: underline; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  pre {
    background: #F5F5F5;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
  }
  code {
    background: #F5F5F5;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 13px;
  }
  blockquote {
    border-left: 4px solid #BDBDBD;
    margin: 0;
    padding-left: 16px;
    color: #616161;
  }
  hr { border: none; border-top: 1px solid #E0E0E0; margin: 1.5em 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #E0E0E0; padding: 8px 12px; }
  th { background: #F5F5F5; }
`;

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

/**
 * Affiche le Markdown converti en HTML dans une WebView sandboxée.
 * - javaScriptEnabled={false} : aucun script exécuté
 * - originWhitelist={[]} : aucune navigation externe possible
 */
export function MarkdownPreview({ markdown }: MarkdownPreviewProps): React.JSX.Element {
  const htmlSource = useMemo(() => {
    const body = markdownToHtml(markdown) || '<p><em>Aperçu vide</em></p>';
    return {
      html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${PREVIEW_CSS}</style>
</head>
<body>${body}</body>
</html>`,
    };
  }, [markdown]);

  return (
    <View style={styles.container}>
      <WebView
        source={htmlSource}
        originWhitelist={[]}
        javaScriptEnabled={false}
        scrollEnabled
        style={styles.webview}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});
