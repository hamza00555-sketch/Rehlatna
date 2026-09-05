"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PreparationCategoryKey, PreparationItem, PreparationStatus } from "@/domain/types";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/Sheet";
import { Field, TextInput, Select, TextArea } from "@/components/ui/Field";
import { ChoiceCard, ChoiceGroup } from "@/components/ui/ChoiceCard";
import { Toggle } from "@/components/ui/Toggle";
import { CATEGORY_ORDER } from "@/server/view-models/preparation";
import { api } from "@/lib/api";
import { m } from "@/i18n";
import styles from "./ItemForm.module.css";

const STATUSES: PreparationStatus[] = ["undecided", "need_to_buy", "owned", "not_required"];

interface Props {
  item?: PreparationItem;
  defaultCategory?: PreparationCategoryKey;
}

export function ItemForm({ item, defaultCategory }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState<PreparationCategoryKey>(item?.category ?? defaultCategory ?? "other");
  const [status, setStatus] = useState<PreparationStatus>(item?.status ?? "undecided");
  const [size, setSize] = useState<"object" | "task">(item?.size ?? "task");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [inBag, setInBag] = useState(item?.inHospitalBag ?? category === "hospital");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      setError(m.forms.requiredField);
      return;
    }
    setBusy(true);
    setError(null);
    const payload = { title: title.trim(), category, status, size, notes: notes.trim() || undefined, inHospitalBag: inBag };
    try {
      if (item) {
        await api(`/api/preparation/${item.id}`, payload, "PATCH");
        router.push(`/preparation/item/${item.id}`);
      } else {
        const res = await api<{ id: string }>("/api/preparation", payload);
        router.push(`/preparation/item/${res.id}`);
      }
      router.refresh();
    } catch {
      setError(m.common.error);
      setBusy(false);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field id="item-title" label={m.preparation.itemTitle} error={error ?? undefined}>
        <TextInput id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={Boolean(error)} maxLength={120} />
      </Field>
      <Field id="item-category" label={m.preparation.category}>
        <Select id="item-category" value={category} onChange={(e) => setCategory(e.target.value as PreparationCategoryKey)}>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {m.preparation.categories[c]}
            </option>
          ))}
        </Select>
      </Field>
      <ChoiceGroup legend={m.preparation.status} columns={2}>
        {STATUSES.map((s) => (
          <ChoiceCard key={s} name="item-status" value={s} checked={status === s} onChange={(v) => setStatus(v as PreparationStatus)} title={m.preparation.statuses[s]!} />
        ))}
      </ChoiceGroup>
      <ChoiceGroup legend={m.preparation.size}>
        <ChoiceCard name="item-size" value="object" checked={size === "object"} onChange={() => setSize("object")} title={m.preparation.sizeObject} />
        <ChoiceCard name="item-size" value="task" checked={size === "task"} onChange={() => setSize("task")} title={m.preparation.sizeTask} />
      </ChoiceGroup>
      <Toggle id="item-bag" checked={inBag} onChange={setInBag} label={m.preparation.inHospitalBag} />
      <Field id="item-notes" label={m.common.notes} optional>
        <TextArea id="item-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button type="submit" fullWidth loading={busy}>
        {m.common.save}
      </Button>
      {item && (
        <>
          <Button type="button" variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
            {m.preparation.deleteItem}
          </Button>
          <BottomSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={m.preparation.deleteItem}>
            <p>{m.finance.confirmChangeBody}</p>
            <Button
              variant="danger"
              fullWidth
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/preparation/${item.id}`, undefined, "DELETE");
                  router.push("/preparation");
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {m.common.confirm}
            </Button>
            <Button variant="quiet" fullWidth onClick={() => setConfirmDelete(false)}>
              {m.common.cancel}
            </Button>
          </BottomSheet>
        </>
      )}
    </form>
  );
}
