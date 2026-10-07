# Incident photos: private S3 bucket, served read-only through the admin web
# CloudFront distribution under /photos/* (same OAC, see admin_web.tf).
# Clients upload directly to S3 with a short-lived presigned POST obtained
# from POST /photos (handlers/photos/upload_url.py), which caps size and
# content type and scopes the key to the caller's user id.
#
# Kept apart from the admin web bucket because its deploy runs
# `aws s3 sync --delete`, which would wipe the photos.

locals {
  photos_base_url = "${local.admin_web_url}/photos"
}

resource "aws_s3_bucket" "photos" {
  bucket = "${var.project}-${var.environment}-incident-photos-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Browser uploads (admin web, mobile app in web mode). Native apps are not
# subject to CORS.
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = concat([local.admin_web_url], var.admin_web_dev_origins)
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

data "aws_iam_policy_document" "photos_bucket" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.photos.arn}/photos/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.admin_web.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id
  policy = data.aws_iam_policy_document.photos_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.photos]
}
