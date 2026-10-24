import { useEffect, useRef, useState } from "react";
import { serializeField } from "../lib/serialize.js";

export function CommandField({
  label,
  action,
  placeholder,
  multiline = false,
  max = 0,
  counterMax = 0,
  initialValue = "",
  role,
  context,
  templates,
  generateAi,
  refreshToken = "",
  onLengthChange,
  onChange,
  onReady,
  inputRef: externalRef,
}) {
  const localRef = useRef(null);
  const inputRef = externalRef || localRef;
  const menuRef = useRef(null);
  const previewRef = useRef(null);
  const commandsRef = useRef(null);
  const [length, setLength] = useState(0);
  const templatesRef = useRef(templates);
  const generateAiRef = useRef(generateAi);
  templatesRef.current = templates;
  generateAiRef.current = generateAi;

  const measure = () => {
    const value = serializeField(inputRef.current, templatesRef.current).length;
    setLength(value);
    if (onLengthChange) onLengthChange(value);
    return value;
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.textContent = initialValue;
    const handleChange = () => {
      measure();
      if (onChange) onChange();
    };
    commandsRef.current = window.AppCommands.attach({
      input,
      menu: menuRef.current,
      preview: previewRef.current,
      onChange: handleChange,
      context,
      role,
      getTemplates: () => templatesRef.current,
      generateAi: (brief) => generateAiRef.current(brief),
    });
    measure();
    if (onReady) onReady(commandsRef.current);
    return () => {
      if (commandsRef.current) commandsRef.current.hideMenu();
    };
    // The command engine is imperative and must attach only once per field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (commandsRef.current) commandsRef.current.refreshVariables();
  }, [refreshToken]);

  const over = counterMax > 0 && length > counterMax;

  return (
    <div className="field">
      <div className="field-label-row">
        <label>{label}</label>
        {action}
      </div>
      <div
        ref={inputRef}
        className="cmd-field"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder={placeholder}
        data-max={max ? String(max) : undefined}
        data-multiline={multiline ? "true" : undefined}
      />
      {counterMax > 0 ? (
        <span className="counter" style={{ color: over ? "var(--error)" : "" }}>
          {length} / {counterMax}
        </span>
      ) : null}
      <div ref={menuRef} className="command-menu hidden" />
      <div ref={previewRef} className="preview hidden" />
    </div>
  );
}
