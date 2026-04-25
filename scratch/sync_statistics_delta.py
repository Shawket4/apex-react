import json
import re

def set_nested_key(data, key_path, value):
    parts = key_path.split('.')
    for part in parts[:-1]:
        data = data.setdefault(part, {})
    data[parts[-1]] = value

en_path = '/Users/shawket/Downloads/apex/src/shared/i18n/locales/en.json'
ar_path = '/Users/shawket/Downloads/apex/src/shared/i18n/locales/ar.json'

with open(en_path, 'r') as f:
    en_data = json.load(f)

with open(ar_path, 'r') as f:
    ar_data = json.load(f)

def get_leaf_keys(data, parent_key=''):
    keys = {}
    if isinstance(data, dict):
        for k, v in data.items():
            new_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                keys.update(get_leaf_keys(v, new_key))
            else:
                keys[new_key] = v
    return keys

en_leafs = get_leaf_keys(en_data)
ar_leafs = get_leaf_keys(ar_data)

all_keys = set(en_leafs.keys()) | set(ar_leafs.keys())

# Guessed AR for new EN keys
ar_translations = {
    'trips.statistics.companies.byVehicle': 'الإيرادات حسب المركبة',
    'trips.statistics.carTable.title': 'كل المركبات',
    'trips.statistics.carTable.subtitle': '{{count}} مركبة · اضغط على أي عمود للترتيب',
    'trips.statistics.carTable.totals': 'الإجماليات',
    'trips.statistics.carTable.liters': 'الحجم (لتر)',
    'trips.statistics.carTable.distance': 'المسافة (كم)',
    'trips.statistics.carTable.baseRevenue': 'الإيراد الأساسي',
    'trips.statistics.carTable.vat': 'الضريبة',
    'trips.statistics.carTable.rent': 'الإيجار',
    'trips.statistics.carTable.total': 'الإجمالي',
    'trips.statistics.excel.cols.routeType': 'نوع المسار',
}

# Guessed EN for new AR keys
en_translations = {
    'trips.statistics.subtabs.overview': 'Overview',
    'trips.statistics.subtabs.routes': 'Routes',
    'trips.statistics.subtabs.cars': 'Vehicles',
    'trips.statistics.companies.group': 'Group',
    'trips.statistics.routes.selectCompany': 'Select company',
    'trips.statistics.routes.headingFor': 'Routes for {{company}}',
    'trips.statistics.routes.empty': 'No routes found for this company',
}

for key in all_keys:
    if key not in en_leafs:
        val = en_translations.get(key, ar_leafs[key])
        set_nested_key(en_data, key, val)
    if key not in ar_leafs:
        val = ar_translations.get(key, en_leafs[key])
        set_nested_key(ar_data, key, val)

# Save back
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=2)
    f.write('\n')

with open(ar_path, 'w', encoding='utf-8') as f:
    json.dump(ar_data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print("Sync done!")
