import importlib.util
from pathlib import Path
from datetime import date
import unittest
spec = importlib.util.spec_from_file_location('timing', Path(__file__).resolve().parents[1]/'scripts/build-source-timing.py')
t = importlib.util.module_from_spec(spec); spec.loader.exec_module(t)

class TimingTests(unittest.TestCase):
    def test_strict_cutoff(self):
        cut=date(2026,6,1)
        self.assertEqual(t.classify(*t.bounds('2026-05-31'), cut), 'before')
        self.assertEqual(t.classify(*t.bounds('2026-06-01'), cut), 'on_or_after')
    def test_partial_dates(self):
        self.assertEqual(t.classify(*t.bounds('2025'), t.SUMMER), 'before')
        self.assertEqual(t.classify(*t.bounds('2026'), t.SUMMER), 'uncertain')
        self.assertEqual(t.classify(*t.bounds('2026-09'), t.ANNOUNCEMENT), 'uncertain')
        self.assertEqual(t.classify(*t.bounds('2026-07'), t.ANNOUNCEMENT), 'before')
        self.assertEqual(t.bounds('2024-02')[1], date(2024,2,29))
    def test_url_refinement(self):
        row={'id':'test','published':'2026','url':'https://example.org/2026/07/article'}
        result=t.timing(row)
        self.assertEqual(result['before_summer'],'on_or_after')
        self.assertEqual(result['before_announcement'],'before')
        self.assertIn('inferred',result['date_basis'])
        row['published']='2025-2026'
        self.assertEqual(t.timing(row)['before_summer'],'uncertain')
        row['published']='2025'
        self.assertEqual(t.timing(row)['date_display'],'2025')

if __name__=='__main__': unittest.main()
