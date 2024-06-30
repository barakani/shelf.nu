import { json, type ActionFunctionArgs } from "@remix-run/node";
import { BulkCheckInAssetsSchema } from "~/components/assets/bulk-checkin-dialog";
import { bulkCheckInAssets } from "~/modules/asset/service.server";
import { sendNotification } from "~/utils/emitter/send-notification.server";
import { makeShelfError } from "~/utils/error";
import { assertIsPost, data, error, parseData } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.validator.server";
import { requirePermission } from "~/utils/roles.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const authSession = context.getSession();
  const userId = authSession.userId;

  try {
    assertIsPost(request);

    await requirePermission({
      userId,
      request,
      entity: PermissionEntity.asset,
      action: PermissionAction.checkin,
    });

    const formData = await request.formData();

    const { assetIds } = parseData(formData, BulkCheckInAssetsSchema);

    await bulkCheckInAssets({
      userId,
      assetIds,
    });

    sendNotification({
      title: "Assets are no longer in custody",
      message: "These assets are available again.",
      icon: { name: "success", variant: "success" },
      senderId: userId,
    });

    return json(data({ success: true }));
  } catch (cause) {
    const reason = makeShelfError(cause, { userId });
    return json(error(reason), { status: reason.status });
  }
}
