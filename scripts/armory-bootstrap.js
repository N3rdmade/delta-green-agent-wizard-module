import { EQUIPMENT_CATALOG, EQUIPMENT_CATEGORIES } from './equipment.js';

const ARCHIVE_CATEGORIES = [
    'Handguns',
    'Rifles',
    'Shotguns',
    'Submachine Guns',
    'Machine Guns',
    'Grenade Launchers',
];

const CATEGORY_ICONS = {
    'Handguns': 'systems/deltagreen/assets/icons/pistol.svg',
    'Rifles': 'systems/deltagreen/assets/icons/rifle.svg',
    'Shotguns': 'systems/deltagreen/assets/icons/shotgun.svg',
    'Submachine Guns': 'systems/deltagreen/assets/icons/smg.svg',
    'Machine Guns': 'systems/deltagreen/assets/icons/rifle.svg',
    'Grenade Launchers': 'systems/deltagreen/assets/icons/grenade.svg',
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function archiveRowToItem(row) {
    const [
        displayName, category, period, country, sourceName, calibre, damage,
        rof, action, shots, baseRange, malfunction, year, notes, pdfPage,
    ] = row;

    const heavy = category === 'Machine Guns' || category === 'Grenade Launchers';
    const details = [
        calibre && `<strong>Calibre:</strong> ${escapeHtml(calibre)}`,
        damage && `<strong>Damage:</strong> ${escapeHtml(damage)}`,
        rof && `<strong>RoF:</strong> ${escapeHtml(rof)}`,
        action && `<strong>Action:</strong> ${escapeHtml(action)}`,
        shots && `<strong>Shots:</strong> ${escapeHtml(shots)}`,
        baseRange && `<strong>Base Range:</strong> ${escapeHtml(baseRange)} m`,
        malfunction && `<strong>Malf:</strong> ${escapeHtml(malfunction)}`,
        year && `<strong>Years:</strong> ${escapeHtml(year)}`,
        country && `<strong>Manufacturer location:</strong> ${escapeHtml(country)}`,
        period && `<strong>Archive section:</strong> ${escapeHtml(period)}`,
        notes && `<strong>Notes:</strong> ${escapeHtml(notes)}`,
        pdfPage && `<strong>Source page:</strong> ${escapeHtml(pdfPage)}`,
    ].filter(Boolean).join('<br>');

    return {
        category,
        name: displayName,
        type: 'weapon',
        img: CATEGORY_ICONS[category] ?? 'icons/svg/item-bag.svg',
        flags: {
            'armament-archive': {
                sourceName,
                category,
                period,
                country,
                calibre,
                damage,
                rof,
                action,
                shots,
                baseRange,
                malfunction,
                year,
                notes,
                pdfPage,
            },
        },
        effects: [],
        system: {
            name: '',
            description: `<p><em>Delta Green Agent Armament Archives entry.</em></p><p>${details}</p>`,
            skill: heavy ? 'heavy_weapons' : 'firearms',
            skillModifier: 0,
            customSkillTarget: 50,
            range: baseRange ? `${baseRange}M` : '',
            damage: damage ?? '',
            armorPiercing: 0,
            lethality: 0,
            isLethal: false,
            killRadius: 'N/A',
            ammo: shots ?? '',
            expense: '',
            equipped: true,
        },
    };
}

async function loadArmamentArchive() {
    const archiveUrl = 'modules/delta-green-agent-wizard/scripts/armament-archive.js.gz';
    const response = await fetch(archiveUrl);
    if (!response.ok) throw new Error(`Armament archive request failed: ${response.status}`);
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('This Foundry/Electron version does not provide DecompressionStream.');
    }

    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    const source = await new Response(stream).text();
    const equals = source.indexOf('=');
    const semicolon = source.lastIndexOf(';');
    if (equals < 0 || semicolon <= equals) throw new Error('Armament archive payload is malformed.');

    const rows = JSON.parse(source.slice(equals + 1, semicolon).trim());

    for (const category of ARCHIVE_CATEGORIES) {
        if (!EQUIPMENT_CATEGORIES.includes(category)) EQUIPMENT_CATEGORIES.push(category);
    }

    const existingNames = new Set(EQUIPMENT_CATALOG.map(item => item.name));
    for (const row of rows) {
        const item = archiveRowToItem(row);
        if (!existingNames.has(item.name)) {
            EQUIPMENT_CATALOG.push(item);
            existingNames.add(item.name);
        }
    }

    console.info(`Delta Green Agent Wizard | Loaded ${rows.length} named armament entries.`);
}

try {
    await loadArmamentArchive();
} catch (error) {
    console.error('Delta Green Agent Wizard | Failed to load named armament archive.', error);
    ui?.notifications?.warn?.('Named firearm archive failed to load; the standard equipment catalog is still available.');
}

await import('./main.js');
