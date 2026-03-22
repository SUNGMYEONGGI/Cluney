"use client";

import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import Underline from "@tiptap/extension-underline";
import { useEffect, useState } from "react";
import styles from "./EditorPane.module.css";

type EditorPaneProps = {
  disabled?: boolean;
  onContentChange: (content: { text: string; html: string }) => void;
  onSubmit: () => void;
};

export function EditorPane({ disabled = false, onContentChange, onSubmit }: EditorPaneProps) {
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline],
    content: "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `${styles.proseMirror} ProseMirror`,
      },
    },
    onCreate({ editor }) {
      const text = editor.getText();
      setCharCount(text.length);
      onContentChange({ text, html: editor.getHTML() });
    },
    onUpdate({ editor }) {
      const text = editor.getText();
      setCharCount(text.length);
      onContentChange({ text, html: editor.getHTML() });
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Editor</h2>
          <div className={styles.metaRow}>
            <div className={styles.hint}>Editor content is not sent to chat.</div>
            <div className={styles.charCount} aria-label="Character count">
              글자수: {charCount}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.toolButton} ${editor?.isActive("bold") ? styles.active : ""}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor || disabled}
          >
            Bold
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${
              editor?.isActive("underline") ? styles.active : ""
            }`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={!editor || disabled}
          >
            Underline
          </button>
          <button type="button" className={styles.submitButton} onClick={onSubmit} disabled={disabled}>
            Submit
          </button>
        </div>
      </header>
      <div className={styles.content}>
        <EditorContent editor={editor} className={styles.editorContainer} />
      </div>
    </section>
  );
}
