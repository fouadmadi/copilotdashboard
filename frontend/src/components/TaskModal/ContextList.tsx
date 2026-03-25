import type { ContextItem } from '../../types';

interface ContextListProps {
  items: ContextItem[];
  onRemove: (id: string) => void;
}

function typeIcon(type: ContextItem['type']) {
  switch (type) {
    case 'text':
      return '📄';
    case 'link':
      return '🔗';
    case 'image':
      return '🖼️';
  }
}

export function ContextList({ items, onRemove }: ContextListProps) {
  if (items.length === 0) {
    return <p className="context-empty">No context items yet.</p>;
  }

  return (
    <ul className="context-list">
      {items.map((item) => (
        <li key={item.id} className="context-item">
          <span className="context-item-icon">{typeIcon(item.type)}</span>
          <div className="context-item-body">
            {item.type === 'link' ? (
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="context-link"
              >
                {item.content}
              </a>
            ) : item.type === 'image' ? (
              <div className="context-image-wrap">
                <img
                  src={item.content}
                  alt={item.filename ?? 'context image'}
                  className="context-image"
                />
                {item.filename && (
                  <span className="context-filename">{item.filename}</span>
                )}
              </div>
            ) : (
              <p className="context-text">{item.content}</p>
            )}
          </div>
          <button
            className="context-remove-btn"
            onClick={() => onRemove(item.id)}
            aria-label="Remove context item"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
