from backend.review_service import split_diff_into_chunks


def test_split_diff_small():
  diff = "diff --git a/file.txt b/file.txt\n+line1\n"
  chunks = split_diff_into_chunks(diff, chunk_size=1000)
  assert chunks == [diff]


def test_split_diff_large_splits_on_files():
  part = "diff --git a/file.txt b/file.txt\n+line\n"
  diff = part * 10
  chunks = split_diff_into_chunks(diff, chunk_size=len(part) * 3)
  # Should produce more than one chunk for this artificially large diff
  assert len(chunks) > 1

