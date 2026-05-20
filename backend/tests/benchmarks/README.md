# Benchmark NAFEMS e validazione analitica

Casi di riferimento per validare i solver del FEA Pro.

Ogni test deve:
- citare il riferimento bibliografico/normativo in docstring
- usare tolleranza esplicita (`pytest.approx(rtol=...)`)
- essere marcato con `@pytest.mark.benchmark`
- non dipendere da risorse esterne

Convenzioni:
- File: `test_nafems_<id>.py` per casi NAFEMS, `test_<descrizione>.py` per casi analitici
- Funzioni: una funzione per ogni caso, nome descrittivo dei vincoli/carichi
