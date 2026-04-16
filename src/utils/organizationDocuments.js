/**
 * وثائق المنظمة كما تُرجعها GET /organizations و GET /organizations/:id.
 * نفس السجلات المخزّنة مع طلب «انضم كشريك» (OrganizationDocuments) — يُعرض الرابط الكامل عبر resolveApiAssetUrl لـ fileUrl النسبي مثل /uploads/...
 */

/** تسميات documentType كما ترجع من الـ API (طلب شراكة / منظمة) */
export const ORGANIZATION_DOCUMENT_TYPE_LABELS = {
  CommercialLicense: "رخصة تجارية",
  TaxCertificate: "شهادة ضريبية",
  IdentityDocument: "هوية",
  Other: "أخرى",
}

export function labelOrganizationDocumentType(type) {
  const t = String(type ?? "").trim()
  if (!t) return "نوع غير محدد"
  return ORGANIZATION_DOCUMENT_TYPE_LABELS[t] ?? t
}

/** مصفوفة documents من الاستجابة (أسماء شائعة في الـ API) */
export function extractOrganizationDocuments(org) {
  if (!org || typeof org !== "object") return []
  const raw =
    org.documents ??
    org.Documents ??
    org.organizationDocuments ??
    org.OrganizationDocuments ??
    org.partnerDocuments ??
    org.PartnerDocuments ??
    org.files ??
    org.Files ??
    org.documentList ??
    org.DocumentList
  return Array.isArray(raw) ? raw : []
}

export function normalizeOrganizationDocumentRow(doc) {
  if (!doc || typeof doc !== "object") return null
  const fileUrl = doc.fileUrl ?? doc.FileUrl ?? doc.url ?? doc.Url ?? ""
  return {
    id: doc.id ?? doc.Id,
    documentType: doc.documentType ?? doc.DocumentType ?? "",
    fileUrl,
    originalFileName: doc.originalFileName ?? doc.OriginalFileName ?? "",
    uploadedAt: doc.uploadedAt ?? doc.UploadedAt ?? "",
  }
}
