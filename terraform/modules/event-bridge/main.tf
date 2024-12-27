resource "aws_scheduler_schedule" "scrape-schedule" {

  for_each = { for index, task in var.tasks : index => task }

  name = "scrape-schedule-${each.key}"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression = "rate(2 minutes)"

  target {
    arn      = var.lambda_arn
    role_arn = aws_iam_role.iam_for_schedule.arn

    # See https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets-universal.html
    input = jsonencode(each.value)
  }
}

# Our EventBridge scheduling assume role
resource "aws_iam_role" "iam_for_schedule" {
  name               = "iam-role-eb-schedule-${var.lambda_name}-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "lambda_invoke_policy" {
  statement {
    effect  = "Allow"
    actions = ["lambda:InvokeFunction"]
    resources = [
      var.lambda_arn,
      "${var.lambda_arn}:*"
    ]
  }
}
resource "aws_iam_policy" "lambda_invoke" {
  name        = "price-watch-iam-policy-${var.lambda_name}-eb-invoke-${var.environment}"
  description = "The police for EventBridge to be allowed to invoke our Lambda"
  policy      = data.aws_iam_policy_document.lambda_invoke_policy.json
}

resource "aws_iam_role_policy_attachment" "scheduler_lambda_invoke_policy_attachment" {
  role       = aws_iam_role.iam_for_schedule.name
  policy_arn = aws_iam_policy.lambda_invoke.arn
}
