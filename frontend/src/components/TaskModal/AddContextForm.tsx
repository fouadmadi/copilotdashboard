import React, { useState, useRef } from 'react';
import type { ContextItemType } from '../../types';

interface AddContextFormProps {
  onAdd: (data: {
    type: ContextItemType;
    content: string;
    filename?: string;
  }) => Promise<void>;
}

type Tab = ContextItemType;

export function AddContextForm({ onAdd }: AddContextFormProps) {
  const [tab, setTab] = useState<Tab>('text');
  const [textValue, setTextValue] = useState('');
  const [linkValue, setLinkValue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (tab === 'text' && textValue.trim()) {
        await onAdd({ type: 'text', content: textValue.trim() });
        setTextValue('');
      } else if (tab === 'link' && linkValue.trim()) {
        await onAdd({ type: 'link', content: linkValue.trim() });
        setLinkValue('');
      } else if (tab === 'image' && imagePreview) {
        await onAdd({
          type: 'image',
          content: imagePreview,
          filename: imageFilename,
        });
        setImagePreview(null);
        setImageFilename('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    (tab === 'text' && textValue.trim().length > 0) ||
    (tab === 'link' && linkValue.trim().length > 0) ||
    (tab === 'image' && imagePreview !== null);

  return (
    <div className="add-context-form">
      <div className="add-context-tabs">
        {(['text', 'link', 'image'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`add-context-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'text' ? '📄 Text' : t === 'link' ? '🔗 Link' : '🖼️ Image'}
          </button>
        ))}
      </div>

      <div className="add-context-body">
        {tab === 'text' && (
          <textarea
            className="form-textarea"
            placeholder="Enter text content..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={4}
          />
        )}
        {tab === 'link' && (
          <input
            className="form-input"
            type="url"
            placeholder="https://example.com"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
          />
        )}
        {tab === 'image' && (
          <div className="image-upload-area">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="form-file-input"
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="image-upload-preview"
              />
            )}
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
      >
        {submitting ? 'Adding…' : 'Add Context'}
      </button>
    </div>
  );
}
