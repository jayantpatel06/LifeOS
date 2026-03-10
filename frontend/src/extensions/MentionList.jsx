import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { FileText, Plus } from 'lucide-react';

export const MentionList = forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = async index => {
        const item = props.items[index];
        if (item) {
            if (item.isNew && props.editor.options.editorProps.createNoteHandler) {
                // Optimistically show creating state if needed, but it should be fast
                const newNote = await props.editor.options.editorProps.createNoteHandler(item.title);
                if (newNote) {
                    props.command({ id: newNote.id, label: newNote.title });
                }
            } else {
                props.command({ id: item.id, label: item.title });
            }
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="bg-popover text-popover-foreground shadow-md rounded-md overflow-hidden max-h-[300px] overflow-y-auto min-w-[200px] p-1">
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm text-left transition-colors ${index === selectedIndex ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted/50'
                            }`}
                        key={item.id}
                        onClick={() => selectItem(index)}
                    >
                        {item.isNew ? (
                            <Plus className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <FileText className="w-4 h-4 opacity-70" />
                        )}
                        <span className="truncate">
                            {item.isNew ? `Create sub-page: "${item.title}"` : item.title}
                        </span>
                        {!item.isNew && item.parentTitle && (
                            <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">in {item.parentTitle}</span>
                        )}
                    </button>
                ))
            ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
            )}
        </div>
    );
});
