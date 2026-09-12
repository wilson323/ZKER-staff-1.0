import unittest
from labels import parse_labels

class LabelsTests(unittest.TestCase):
    def test_trim(self):
        self.assertEqual(parse_labels([" a ", "b"]), ["a", "b"])
    def test_blank(self):
        self.assertEqual(parse_labels(["", "  "]), [])
    def test_unique_order(self):
        self.assertEqual(parse_labels([" b ", "a", "b", "a"]), ["b", "a"])
    def test_empty(self):
        self.assertEqual(parse_labels([]), [])
