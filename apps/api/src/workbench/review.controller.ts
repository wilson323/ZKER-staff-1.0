/**
 * M1-06 独立审核与交付 API（C10/C11）。
 *
 * 主体仅从会话派生；禁止自批；PENDING_COMMIT 不标已交付。
 * TRACE-review-20260912-控制器
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { DeliveryRegistry } from "./review.delivery-registry";
import { ReviewRegistry } from "./review.registry";
import {
  CheckCompletionBody,
  CompletionCheckRecord,
  DecideReviewBody,
  DeliveryCommitRecord,
  DeliveryView,
  RequestReviewBody,
  ReviewListResponse,
  ReviewReceiptRecord,
  ReviewRequestRecord,
  SubmitDeliveryBody,
} from "./review.types";
import { resolveSessionFromHeaders } from "./workbench.session";
import { WorkbenchSession } from "./workbench.types";

@Controller()
export class ReviewController {
  constructor(
    private readonly reviews: ReviewRegistry,
    private readonly deliveries: DeliveryRegistry,
  ) {}

  /** POST .../reviews — C10 送审。 */
  @Post("workbench/claimable-tasks/:taskId/reviews")
  @HttpCode(201)
  requestReview(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: RequestReviewBody,
  ): ReviewRequestRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.reviews.requestReview(session, taskId, body ?? ({} as RequestReviewBody)),
    );
  }

  /** GET .../reviews — 列表。 */
  @Get("workbench/claimable-tasks/:taskId/reviews")
  listReviews(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): ReviewListResponse<ReviewRequestRecord> {
    const session = this.requireSession(headers);
    return this.run(() => this.reviews.listReviews(session, taskId));
  }

  /** GET .../review-receipts — 回执列表。 */
  @Get("workbench/claimable-tasks/:taskId/review-receipts")
  listReceipts(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): ReviewListResponse<ReviewReceiptRecord> {
    const session = this.requireSession(headers);
    return this.run(() => this.reviews.listReceipts(session, taskId));
  }

  /** POST .../reviews/:id/decide — C10 决定。 */
  @Post("workbench/reviews/:reviewId/decide")
  @HttpCode(201)
  decide(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("reviewId") reviewId: string,
    @Body() body: DecideReviewBody,
  ): ReviewReceiptRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.reviews.decideReview(
        session,
        reviewId,
        body ?? ({} as DecideReviewBody),
      ),
    );
  }

  /** POST .../completion-checks — C11 预检。 */
  @Post("workbench/claimable-tasks/:taskId/completion-checks")
  @HttpCode(201)
  checkCompletion(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: CheckCompletionBody,
  ): CompletionCheckRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.deliveries.checkCompletion(
        session,
        taskId,
        body ?? ({} as CheckCompletionBody),
      ),
    );
  }

  /** POST .../deliveries — C11 提交交付。 */
  @Post("workbench/claimable-tasks/:taskId/deliveries")
  @HttpCode(201)
  submitDelivery(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
    @Body() body: SubmitDeliveryBody,
  ): DeliveryCommitRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.deliveries.submitDelivery(
        session,
        taskId,
        body ?? ({} as SubmitDeliveryBody),
      ),
    );
  }

  /** GET .../deliveries — 列表。 */
  @Get("workbench/claimable-tasks/:taskId/deliveries")
  listDeliveries(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("taskId") taskId: string,
  ): ReviewListResponse<DeliveryCommitRecord> {
    const session = this.requireSession(headers);
    return this.run(() => this.deliveries.listDeliveries(session, taskId));
  }

  /** GET .../deliveries/:id/view — 人员视图。 */
  @Get("workbench/deliveries/:deliveryId/view")
  viewDelivery(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("deliveryId") deliveryId: string,
  ): DeliveryView {
    const session = this.requireSession(headers);
    return this.run(() => this.deliveries.viewDelivery(session, deliveryId));
  }

  /** POST .../deliveries/:id/confirm-oa — OA 同步确认。 */
  @Post("workbench/deliveries/:deliveryId/confirm-oa")
  @HttpCode(200)
  confirmOa(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param("deliveryId") deliveryId: string,
  ): DeliveryCommitRecord {
    const session = this.requireSession(headers);
    return this.run(() =>
      this.deliveries.confirmOaDelivery(session, deliveryId),
    );
  }

  private requireSession(
    headers: Record<string, string | string[] | undefined>,
  ): WorkbenchSession {
    try {
      return resolveSessionFromHeaders(headers);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private run<T>(action: () => T): T {
    try {
      return action();
    } catch (error: unknown) {
      this.throwMapped(error);
    }
  }

  private throwMapped(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not found")) {
      throw new NotFoundException(message);
    }
    if (
      message.includes("conflict") ||
      message.includes("mismatch") ||
      message.includes("stale") ||
      message.includes("expired") ||
      message.includes("already exists")
    ) {
      throw new ConflictException(message);
    }
    if (
      message.includes("denied") ||
      message.includes("only") ||
      message.includes("self-approval")
    ) {
      throw new ForbiddenException(message);
    }
    throw new BadRequestException(message);
  }
}
