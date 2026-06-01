export default async function menuotaku(prefix, botName = "MeuBot", userName = "Usuário", {
    header = `╭┈⊰ 🌸 『 *${botName}* 』\n┊Olá, #user#!\n╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    menuTopBorder = "╭┈",
    bottomBorder = "╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯",
    menuItemIcon = "•.̇𖥨֗🍓⭟",
    separatorIcon = "❁",
    middleBorder = "┊"
} = {}) {
    const formattedHeader = header.replace(/#user#/g, userName);
    return `${formattedHeader}

${menuTopBorder}${separatorIcon} *⛩️ MENU OTAKU ⛩️*
${middleBorder}
${middleBorder}${menuItemIcon}${prefix}anime
${middleBorder}${menuItemIcon}${prefix}buscaranime [nome]
${middleBorder}${menuItemIcon}${prefix}topanimes
${middleBorder}${menuItemIcon}${prefix}personagem [nome]
${middleBorder}${menuItemIcon}${prefix}fraseanime
${middleBorder}${menuItemIcon}${prefix}animenews
${bottomBorder}`;
}
