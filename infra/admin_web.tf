# Admin web app hosting (apps/admin-web, Vite SPA): private S3 bucket served
# only through CloudFront via Origin Access Control. Deploy with
# `aws s3 sync dist s3://<bucket> --delete` + a CloudFront invalidation (see
# README).

data "aws_caller_identity" "current" {}

locals {
  admin_web_url = "https://${aws_cloudfront_distribution.admin_web.domain_name}"
}

resource "aws_s3_bucket" "admin_web" {
  # Account id suffix keeps the globally-unique bucket name collision-free.
  bucket = "${var.project}-${var.environment}-admin-web-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "admin_web" {
  bucket = aws_s3_bucket.admin_web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "admin_web" {
  bucket = aws_s3_bucket.admin_web.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_cloudfront_origin_access_control" "admin_web" {
  name                              = "${var.project}-${var.environment}-admin-web"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# AWS-managed policies, see
# https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

resource "aws_cloudfront_distribution" "admin_web" {
  enabled             = true
  comment             = "${var.project}-${var.environment} admin web"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  http_version        = "http2and3"

  origin {
    origin_id                = "admin-web-s3"
    domain_name              = aws_s3_bucket.admin_web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.admin_web.id
  }

  # Incident photos (photos.tf). Object keys start with "photos/", so the
  # request path maps 1:1 to the key.
  origin {
    origin_id                = "photos-s3"
    domain_name              = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.admin_web.id
  }

  ordered_cache_behavior {
    path_pattern               = "/photos/*"
    target_origin_id           = "photos-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  default_cache_behavior {
    target_origin_id           = "admin-web-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  # SPA client-side routing: unknown paths fall back to index.html. With OAC,
  # S3 answers 403 (not 404) for missing keys, so both are mapped.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

data "aws_iam_policy_document" "admin_web_bucket" {
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.admin_web.arn}/*"]

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

resource "aws_s3_bucket_policy" "admin_web" {
  bucket = aws_s3_bucket.admin_web.id
  policy = data.aws_iam_policy_document.admin_web_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.admin_web]
}
