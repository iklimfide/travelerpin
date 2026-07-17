"use client";

import type { ReactNode } from "react";
import { useAppMessages } from "@/lib/i18n/client-messages";

export type ProfileOwnerPanelMode = "closed" | "edit";

type ProfileOwnerSectionProps = {
  title: string;
  countLabel: string;
  panel: ProfileOwnerPanelMode;
  onPanelChange: (mode: ProfileOwnerPanelMode) => void;
  onAdd: () => void;
  editContent: ReactNode;
};

function toggleEditPanel(current: ProfileOwnerPanelMode): ProfileOwnerPanelMode {
  return current === "edit" ? "closed" : "edit";
}

export function ProfileOwnerSection({
  title,
  countLabel,
  panel,
  onPanelChange,
  onAdd,
  editContent,
}: ProfileOwnerSectionProps) {
  const { profile: profileMessages } = useAppMessages();
  return (
    <section className="profile-owner-section">
      <div className="profile-owner-section__header">
        <div className="profile-owner-section__intro">
          <h3 className="profile-owner-section__title">{title}</h3>
          <p className="profile-owner-section__count">{countLabel}</p>
        </div>
        <div className="profile-owner-section__actions">
          <button
            type="button"
            className={`profile-owner-section__btn${panel === "edit" ? " profile-owner-section__btn--active" : ""}`}
            onClick={() => onPanelChange(toggleEditPanel(panel))}
          >
            {profileMessages.ownerEdit}
          </button>
          <button type="button" className="profile-owner-section__btn profile-owner-section__btn--add" onClick={onAdd}>
            {profileMessages.ownerAdd}
          </button>
        </div>
      </div>

      {panel === "edit" ? (
        <div className="profile-owner-section__body profile-owner-section__body--edit">{editContent}</div>
      ) : null}
    </section>
  );
}
