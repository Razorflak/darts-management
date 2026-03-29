export const formatDate = (date: Date | string | null | undefined): string => {
	if (!date) return ""
	const d = date instanceof Date ? date : new Date(date + "T00:00")
	if (isNaN(d.getTime())) return ""
	return d.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	})
}
