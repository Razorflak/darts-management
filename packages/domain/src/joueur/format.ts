function toPascalCase(str: string): string {
	return str
		.trim()
		.split(" ")
		.filter(Boolean)
		.map((word) =>
			word
				.split("-")
				.map(
					(part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
				)
				.join("-"),
		)
		.join(" ")
}

export const formatPlayerInfo = (player: {
	first_name: string
	last_name: string
	department: string
	licence_no?: string | null
}) => ({
	first_name: toPascalCase(player.first_name),
	last_name: player.last_name.toUpperCase(),
	department: player.department,
	licence_no: player.licence_no,
})
