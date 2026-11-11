/**
 * Analyte picker of the group / dynamic table: the chips + "Agregar analito" bar and its dropdown (search box,
 * study list, analyte list), plus the dynamic table's chart scaffold. Preact: same DOM and classes the string
 * builders in tend-group-analyte-picker.mjs and tend-dynamic-table-modal.mjs made. The dropdown keeps its own
 * state (open, chosen study, search text); the search box is never unmounted while it is open, so it keeps
 * focus and what was typed. The add / remove rules stay in the .mjs, which passes callbacks in. Every draw
 * unmounts first and wipes the host, like the old `innerHTML` swap.
 */
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const X_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function PivotHint({ text }) {
  return <p class="tend-pivot-hint">{text}</p>;
}

export function SectionList({ groups, onPick }) {
  if (!groups.length) return <p class="tend-analyte-picker-empty">Sin estudios que coincidan.</p>;
  return (
    <>
      {groups.map((g) => (
        <button type="button" class="tend-analyte-picker-option" data-section-key={g.sectionKey} onClick={(ev) => onPick(ev, g.sectionKey)}>{g.label}</button>
      ))}
    </>
  );
}

export function FieldList({ label, fields, onBack, onPick }) {
  return (
    <>
      <button type="button" class="tend-analyte-picker-back" onClick={onBack}>{'‹ ' + label}</button>
      {fields.length ? (
        fields.map((f) => (
          <button type="button" class="tend-analyte-picker-option" data-field-key={f.fieldKey} onClick={(ev) => onPick(ev, f.fieldKey)}>{f.title}</button>
        ))
      ) : (
        <p class="tend-analyte-picker-empty">Sin analitos que coincidan.</p>
      )}
    </>
  );
}

/** The dropdown frame: search box + list. `children` is the study or analyte list. */
export function Dropdown({ placeholder, query, onQuery, inputRef, dropdownRef, children }) {
  return (
    <div class="tend-analyte-picker-dropdown" ref={dropdownRef}>
      <input type="text" class="tend-analyte-picker-input" placeholder={placeholder} autocomplete="off" ref={inputRef} value={query} onInput={(ev) => onQuery(ev.currentTarget.value)} />
      <div class="tend-analyte-picker-list">{children}</div>
    </div>
  );
}

const has = (text, q) => String(text).toLowerCase().indexOf(q) >= 0;

/**
 * chips: [{ key, name, secLabel }]. getGroups(): [{ sectionKey, label, specs: [{ fieldKey, title }] }], read each
 * time the dropdown opens. onPickField(sectionKey, fieldKey) / onRemove(key) are the .mjs rules.
 */
export function AnalytePicker({ chips, getGroups, onPickField, onRemove }) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [query, setQuery] = useState('');
  const addRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Click outside the dropdown (and not on the add button) closes it.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (ev) => {
      if ((dropdownRef.current && dropdownRef.current.contains(ev.target)) || ev.target === addRef.current) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  // The search box takes focus when the dropdown opens and when the list switches between studies and analytes.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, activeKey]);

  const toggle = (ev) => {
    ev.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    setGroups(getGroups());
    setActiveKey(null);
    setQuery('');
    setOpen(true);
  };
  const active = activeKey == null ? null : groups.filter((g) => g.sectionKey === activeKey)[0] || null;
  const q = query.trim().toLowerCase();
  const pick = (setKey) => (ev, key) => {
    ev.stopPropagation();
    setKey(key);
    setQuery('');
  };

  let list = null;
  if (open && !active) {
    list = <SectionList groups={q ? groups.filter((g) => has(g.label, q)) : groups} onPick={pick(setActiveKey)} />;
  } else if (open) {
    list = (
      <FieldList
        label={active.label}
        fields={q ? active.specs.filter((f) => has(f.title, q)) : active.specs}
        onBack={pick(() => setActiveKey(null))}
        onPick={(ev, fk) => {
          ev.stopPropagation();
          onPickField(active.sectionKey, fk);
        }}
      />
    );
  }

  return (
    <>
      <div class="tend-analyte-picker-bar">
        {chips.map((c) => (
          <span class="tend-pivot-chip" title={c.secLabel}>
            {c.name}
            <button type="button" class="tend-pivot-chip-x" data-remove-extra={c.key} aria-label={'Quitar ' + c.name} onClick={(ev) => { ev.stopPropagation(); onRemove(c.key); }}>{X_ICON}</button>
          </span>
        ))}
        <button type="button" class="tend-pill tend-analyte-picker-add-btn" ref={addRef} onClick={toggle}>+ Agregar analito</button>
        {open && (
          <Dropdown placeholder={active ? 'Buscar analito…' : 'Buscar estudio…'} query={query} onQuery={setQuery} inputRef={inputRef} dropdownRef={dropdownRef}>{list}</Dropdown>
        )}
      </div>
      <PivotHint text="Marca un analito en la lista de la izquierda para agregarlo o quitarlo." />
    </>
  );
}

/** Dynamic table charts: the picker slot, then the hint or one empty box per study (the chart code fills them). */
export function DynScaffold({ hint, sections }) {
  return (
    <>
      <div id="tend-group-analyte-picker-slot"></div>
      <div id="tend-dynamic-charts-body">
        {hint ? <PivotHint text={hint} /> : sections.map(() => <div class="tend-dynamic-charts-section"></div>)}
      </div>
    </>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawAnalytePicker = (slot, props) => draw(slot, <AnalytePicker {...props} />);
export const drawDynScaffold = (wrap, props) => draw(wrap, <DynScaffold {...props} />);
/** Empty a host this file's views drew into (replaces `innerHTML = ''`, which would leave Preact's tree behind). */
export function clearTendHost(host) {
  render(null, host);
  host.textContent = '';
}
