import logging
import subprocess
from pathlib import Path
from typing import Union

logger = logging.getLogger(__name__)


def tex_to_pdf(tex_file: Union[str, Path], cleanup_aux: bool = True) -> Path:
    """
    Compiles a .tex file to .pdf using pdflatex.
    Cleans up auxiliary files (.aux, .log, .out) automatically.

    Args:
        tex_file: Path to the .tex file.
        cleanup_aux: Whether to remove .aux, .log, and .out artifacts.

    Returns:
        Path to the generated .pdf file.
    """
    tex_path = Path(tex_file).resolve()

    if not tex_path.exists():
        raise FileNotFoundError(f"LaTeX file not found: {tex_path}")

    output_dir = tex_path.parent

    command = [
        "pdflatex",
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-output-directory",
        str(output_dir),
        str(tex_path),
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired as e:
        logger.error("LaTeX compilation timed out for %s: %s", tex_path, e)
        raise RuntimeError("LaTeX compilation timed out.")

    if result.returncode != 0:
        logger.error(
            "LaTeX compilation failed for %s.\nSTDOUT:\n%s\nSTDERR:\n%s",
            tex_path,
            result.stdout[-1000:],
            result.stderr,
        )
        raise RuntimeError(f"Failed to generate PDF: {result.stdout[-300:]}")

    pdf_path = output_dir / f"{tex_path.stem}.pdf"

    if not pdf_path.exists():
        raise RuntimeError("pdflatex completed, but PDF file was not found.")

    logger.info("PDF compiled successfully: %s", pdf_path)

    if cleanup_aux:
        for ext in (".aux", ".log", ".out"):
            aux_file = output_dir / f"{tex_path.stem}{ext}"
            if aux_file.exists():
                try:
                    aux_file.unlink()
                except Exception as err:
                    logger.debug("Could not remove aux file %s: %s", aux_file, err)

    return pdf_path
