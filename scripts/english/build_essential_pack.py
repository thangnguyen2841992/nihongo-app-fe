"""Build the lesson JSON, or a private local package that also contains the PDF."""
import argparse
import base64
import hashlib
import json
from pathlib import Path

from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True, type=Path)
parser.add_argument('--map', type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--curriculum-only', action='store_true', help='Export lesson JSON without embedding the original PDF.')
args = parser.parse_args()
app_root = Path(__file__).resolve().parents[2]
if not args.curriculum_only and any(args.output.resolve().is_relative_to(app_root / folder) for folder in ['src', 'public', 'dist']):
    raise ValueError('Keep this personal PDF package outside public/, src/ and dist/.')

pdf_bytes = args.source.read_bytes()
digest = hashlib.sha256(pdf_bytes).hexdigest()
reader = PdfReader(args.source)
if len(reader.pages) != 318:
    raise ValueError('This guide is mapped to the supplied 318-page Fourth Edition PDF.')
mapping = {}
if args.map and args.map.exists():
    manifest = json.loads(args.map.read_text(encoding='utf-8'))
    if manifest['sha256'] != digest:
        raise ValueError('The page map belongs to another PDF.')
    mapping = {unit['id']: unit for unit in manifest['units']}

categories = [
    (9, 'Hiện tại'), (14, 'Quá khứ'), (20, 'Hiện tại hoàn thành'), (22, 'Bị động'),
    (24, 'Các dạng động từ'), (28, 'Tương lai'), (36, 'Động từ tình thái và mệnh lệnh'),
    (39, 'There và it'), (43, 'Trợ động từ'), (49, 'Câu hỏi'), (50, 'Lời nói gián tiếp'),
    (54, 'V-ing và to V'), (58, 'Go, get, do, make, have'), (64, 'Đại từ và sở hữu'),
    (73, 'Danh từ và mạo từ'), (84, 'Từ chỉ định và chỉ lượng'), (92, 'Tính từ và trạng từ'),
    (96, 'Trật tự từ'), (102, 'Từ nối và mệnh đề'), (113, 'Giới từ'), (115, 'Cụm động từ'),
]
units = []
notes_file = Path(__file__).with_name('essential-grammar-vi.tsv')
for line in notes_file.read_text(encoding='utf-8').splitlines():
    if not line.strip():
        continue
    fields = line.split('|')
    if len(fields) != 11:
        raise ValueError(f'Expected 11 columns for Unit {fields[0]}; found {len(fields)}')
    number, title, title_vi, pattern, explanation, example_en, example_vi, caution, prompt, choices, answer = fields
    number, answer = int(number), int(answer)
    options = choices.split('~')
    if not 0 <= answer < len(options):
        raise ValueError(f'Invalid answer in Unit {number}')
    source_pages = mapping.get(number, {'theoryPage': 2 * number + 9, 'exercisePage': 2 * number + 10, 'keyPages': []})
    units.append({
        'id': number, 'title': title, 'titleVi': title_vi,
        'category': next(name for last, name in categories if number <= last),
        'pattern': pattern, 'explanation': explanation,
        'example': {'en': example_en, 'vi': example_vi}, 'caution': caution,
        'exercise': {
            'prompt': prompt, 'options': options, 'answer': answer,
            'explanation': f'Chọn “{options[answer]}”. Mẫu cần áp dụng: {pattern}. {caution}',
        },
        'theoryPage': source_pages['theoryPage'], 'exercisePage': source_pages['exercisePage'],
        'keyPages': source_pages['keyPages'],
    })
if [unit['id'] for unit in units] != list(range(1, 116)):
    raise ValueError('The guide must contain every Unit from 1 to 115 exactly once.')

package = {
    'kind': 'essential-grammar-curriculum' if args.curriculum_only else 'essential-grammar-personal', 'version': 1,
    'source': {'filename': args.source.name, 'pageCount': len(reader.pages), 'sha256': digest},
    'units': units,
}
if not args.curriculum_only:
    package['source']['dataBase64'] = base64.b64encode(pdf_bytes).decode('ascii')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(package, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(json.dumps({'output': str(args.output.resolve()), 'units': len(units), 'pdfPages': len(reader.pages),
                  'sizeMB': round(args.output.stat().st_size / 1024 / 1024, 2),
                  'mappedAnswerUnits': sum(bool(unit['keyPages']) for unit in units)}, ensure_ascii=False))
