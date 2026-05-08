import json
import subprocess
import unittest
import zipfile
import xml.etree.ElementTree as ET


NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def generate_docx(payload):
    result = subprocess.run(
        ["python3", "generate_listado.py"],
        input=json.dumps(payload).encode("utf-8"),
        capture_output=True,
        check=True,
    )
    return result.stdout


def problem_rows(docx_bytes):
    rows = []
    with zipfile.ZipFile(__import__("io").BytesIO(docx_bytes)) as docx:
        root = ET.fromstring(docx.read("word/document.xml"))
    for row in root.findall(".//w:tr", NS):
        cells = row.findall("w:tc", NS)
        texts = [
            "".join(t.text or "" for t in cell.findall(".//w:t", NS))
            for cell in cells
        ]
        if len(texts) == 4 and any("TEST" in text for text in texts):
            rows.append(texts)
    return rows


def problem_row_elements(docx_bytes):
    rows = []
    with zipfile.ZipFile(__import__("io").BytesIO(docx_bytes)) as docx:
        root = ET.fromstring(docx.read("word/document.xml"))
    for row in root.findall(".//w:tr", NS):
        cells = row.findall("w:tc", NS)
        texts = [
            "".join(t.text or "" for t in cell.findall(".//w:t", NS))
            for cell in cells
        ]
        if len(texts) == 4 and any("TEST" in text for text in texts):
            rows.append(row)
    return rows


class GenerateListadoTests(unittest.TestCase):
    BASE_PATIENT = {
        "nombre": "TEST",
        "registro": "1",
        "edad": "1",
        "sexo": "M",
        "area": "MI",
        "servicio": "MI",
        "cuarto": "1",
        "cama": "1",
    }

    def test_activo_e_inactivo_del_mismo_indice_comparten_fila(self):
        docx = generate_docx(
            {
                "patient": self.BASE_PATIENT,
                "listado": {
                    "activos": [
                        {
                            "fecha": "2026-05-07",
                            "descripcion": "ACTIVO TEST\na) detalle",
                        }
                    ],
                    "inactivos": [
                        {
                            "fecha": "2026-05-07",
                            "descripcion": "INACTIVO TEST\na) detalle",
                        }
                    ],
                },
                "medicos": {},
            }
        )

        rows = problem_rows(docx)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][1], "1.")
        self.assertIn("ACTIVO TEST", rows[0][2])
        self.assertIn("INACTIVO TEST", rows[0][3])

    def test_filas_se_alinean_por_indice_y_solo_inactivo_aparece_solo(self):
        docx = generate_docx(
            {
                "patient": self.BASE_PATIENT,
                "listado": {
                    "activos": [
                        {"fecha": "2026-05-07", "descripcion": "ACTIVO TEST UNO"},
                    ],
                    "inactivos": [
                        {"fecha": "2026-05-07", "descripcion": "INACTIVO TEST UNO"},
                        {"fecha": "2026-05-07", "descripcion": "INACTIVO TEST DOS"},
                    ],
                },
                "medicos": {},
            }
        )

        rows = problem_rows(docx)

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0][1], "1.")
        self.assertIn("ACTIVO TEST UNO", rows[0][2])
        self.assertIn("INACTIVO TEST UNO", rows[0][3])
        self.assertEqual(rows[1][1], "2.")
        self.assertEqual(rows[1][2], "")
        self.assertIn("INACTIVO TEST DOS", rows[1][3])

    def test_texto_de_filas_de_problemas_usa_8_pt(self):
        docx = generate_docx(
            {
                "patient": self.BASE_PATIENT,
                "listado": {
                    "activos": [
                        {
                            "fecha": "2026-05-07",
                            "descripcion": "ACTIVO TEST\na) detalle TEST",
                        },
                    ],
                    "inactivos": [],
                },
                "medicos": {},
            }
        )

        row = problem_row_elements(docx)[0]
        sizes = [
            sz.attrib[f"{{{NS['w']}}}val"]
            for sz in row.findall(".//w:sz", NS)
        ]

        self.assertTrue(sizes)
        self.assertEqual(set(sizes), {"16"})


if __name__ == "__main__":
    unittest.main()
