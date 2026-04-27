import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useStock } from "../../hooks/useApi";
import { BloodBadge, StatusBadge, Icon, Spinner, ErrorBanner } from "../common/Common";
import styles from "./Inventory.module.css";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
//Update Stock
function StockForm({ existing, onSave, onClose, t }) {
  const [bloodType, setBloodType] = useState(existing?.bloodType || existing?.type || "");
  const [units, setUnits] = useState(existing ? String(existing.units) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isEdit = !!existing;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const num = parseInt(units);
    if (!bloodType) { setErr("Select a blood type."); return; }
    if (isNaN(num) || num < 0) { setErr("Enter a valid unit count (≥ 0)."); return; }
    setSaving(true);
    try {
      await onSave(bloodType, num);
      onClose();
    } catch (er) {
      setErr(er.message);
    } finally { setSaving(false); }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal}
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
        onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader} style={{ borderBottom: `1px solid ${t.border}` }}>
          <span style={{ color: t.text, fontWeight: 700, fontSize: 16 }}>
            {isEdit ? "Update Stock" : "Add Blood Stock"}
          </span>
          <button className={styles.closeBtn} style={{ color: t.textMuted }} onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} style={{ color: t.textMuted }}>Blood Type</label>
            {isEdit ? (
              <div className={styles.lockedType}>
                <BloodBadge type={bloodType} />
                <span style={{ color: t.textMuted, fontSize: 12 }}>
                  (cannot change type — update units only)
                </span>
              </div>
            ) : (
              <div className={styles.bloodTypeGrid}>
                {BLOOD_TYPES.map(bt => (
                  <button key={bt} type="button"
                    className={`${styles.btBtn} ${bloodType === bt ? styles.btBtnActive : ""}`}
                    style={{
                      background: bloodType === bt ? t.gradientRed : t.bgDark,
                      color: bloodType === bt ? "#fff" : t.textMuted,
                      border: `1px solid ${bloodType === bt ? "transparent" : t.border}`,
                    }}
                    onClick={() => setBloodType(bt)}>
                    {bt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} style={{ color: t.textMuted }}>
              Units Available
            </label>
            <input
              type="number"
              min="0"
              value={units}
              onChange={e => setUnits(e.target.value)}
              placeholder="e.g. 25"
              className={styles.unitsInput}
              style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
              required
            />
            {units !== "" && !isNaN(parseInt(units)) && (
              <div className={styles.statusPreview}>
                Status will be:{" "}
                <strong style={{
                  color: parseInt(units) < 5 ? "#DA2525" : parseInt(units) < 20 ? "#FF9500" : "#41C343",
                }}>
                  {parseInt(units) < 5 ? "Critical" : parseInt(units) < 20 ? "Low" : "Adequate"}
                </strong>
              </div>
            )}
          </div>

          {err && <div className={styles.formErr}>{err}</div>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn}
              style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.textMuted }}
              onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}
              style={{ background: t.gradientRed }}
              disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update Stock" : "Add Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Inventory page ──────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useTheme();
  const { stock, loading, error, refetch, updateStock } = useStock();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const filtered = filter === "all" ? stock : stock.filter(s => s.status === filter);

  const total    = stock.reduce((s, i) => s + (i.units || 0), 0);
  const critical = stock.filter(s => s.status === "critical").length;
  const low      = stock.filter(s => s.status === "low").length;

  // Determine which blood types still need to be added
  const existingTypes = new Set(stock.map(s => s.bloodType || s.type));
  const missingTypes  = BLOOD_TYPES.filter(bt => !existingTypes.has(bt));

  const handleSave = async (bloodType, units) => {
    await updateStock(bloodType, units);
    refetch();
  };

  const openEdit = (item) => { setEditItem(item); setShowForm(true); };
  const openAdd  = () => { setEditItem(null); setShowForm(true); };
  const closeForm= () => { setShowForm(false); setEditItem(null); };

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle} style={{ color: t.text }}>Blood Inventory</h2>
          <p className={styles.pageSub} style={{ color: t.textMuted }}>
            Manage your blood stock levels
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.textMuted }}
            onClick={refetch}>
            <Icon name="refresh" size={15} color={t.textMuted} />
          </button>
          {missingTypes.length > 0 && (
            <button className={styles.addBtn}
              style={{ background: t.gradientRed }}
              onClick={openAdd}>
              <Icon name="plus" size={15} color="#fff" /> Add Stock
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Critical alert */}
      {critical > 0 && (
        <div className={styles.alertBanner}
          style={{ background: t.redMuted2, border: `1px solid ${t.borderRed}`, color: t.danger }}>
          ⚠️ {critical} blood type{critical > 1 ? "s" : ""} critically low — immediate restock required
        </div>
      )}

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        {[
          { label: "Total Units",   value: total,    color: t.primary   },
          { label: "Blood Types",   value: stock.length, color: t.blue  },
          { label: "Low / Critical", value: `${low} / ${critical}`, color: t.danger },
        ].map((s, i) => (
          <div key={i} className={styles.summaryCard}
            style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className={styles.summaryBar} style={{ background: s.color }} />
            <div>
              <div className={styles.summaryLabel} style={{ color: t.textMuted }}>{s.label}</div>
              <div className={styles.summaryValue} style={{ color: t.text }}>{loading ? "—" : s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className={styles.filters}>
        {["all", "adequate", "low", "critical"].map(f => (
          <button key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
            style={{
              background: filter === f ? t.primary : t.surface,
              color: filter === f ? "#fff" : t.textMuted,
              border: `1px solid ${filter === f ? t.primary : t.border}`,
            }}
            onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <Spinner label="Loading inventory…" />
      ) : filtered.length === 0 ? (
        <div className={styles.emptyBox}
          style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ color: t.textMuted, fontSize: 14, textAlign: "center", padding: 32 }}>
            {stock.length === 0
              ? "No stock recorded yet. Click \"Add Stock\" to get started."
              : `No ${filter} stock found.`}
          </div>
        </div>
      ) : (
        <div className={styles.table}
          style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          {/* Header */}
          <div className={styles.tableHeader} style={{ background: t.bgDark, borderBottom: `1px solid ${t.border}` }}>
            {["Blood Type", "Stock Level", "Units", "Status", "Action"].map(h => (
              <span key={h} className={styles.tableHeading} style={{ color: t.textMuted }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(item => {
            const bt = item.bloodType || item.type;
            const pct = Math.min(100, ((item.units || 0) / 70) * 100);
            return (
              <div key={bt} className={styles.tableRow}
                style={{ borderBottom: `1px solid ${t.border}` }}>
                <BloodBadge type={bt} />

                <div className={styles.barWrap}>
                  <div className={styles.barBg} style={{ background: t.bgDark }}>
                    <div className={styles.barFill} style={{
                      width: `${pct}%`,
                      background: item.status === "critical" ? t.danger
                        : item.status === "low" ? t.warning : t.success,
                    }} />
                  </div>
                  <span className={styles.barPct} style={{ color: t.textMuted }}>
                    {Math.round(pct)}%
                  </span>
                </div>

                <span className={styles.unitsCell} style={{ color: t.text }}>
                  {item.units}
                  <span style={{ color: t.textMuted, fontSize: 11 }}> units</span>
                </span>

                <StatusBadge status={item.status} />

                <button className={styles.editBtn}
                  style={{ background: `${t.primary}12`, border: `1px solid ${t.primary}30`, color: t.primary }}
                  onClick={() => openEdit(item)}>
                  <Icon name="edit" size={12} color={t.primary} /> Update
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Missing types quick-add */}
      {!loading && missingTypes.length > 0 && (
        <div className={styles.missingSection}>
          <div className={styles.missingSectionTitle} style={{ color: t.textMuted }}>
            Not yet added
          </div>
          <div className={styles.missingTypes}>
            {missingTypes.map(bt => (
              <button key={bt}
                className={styles.missingBtn}
                style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}
                onClick={() => { setEditItem({ bloodType: bt, units: 0 }); setShowForm(true); }}>
                <Icon name="plus" size={12} color={t.textMuted} />
                {bt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <StockForm
          existing={editItem}
          onSave={handleSave}
          onClose={closeForm}
          t={t}
        />
      )}
    </div>
  );
}
