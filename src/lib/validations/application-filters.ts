import { z } from "zod";

import { APPLICATION_STATUS_VALUES } from "../../constants/application-status";

export const applicationsSearchParamsSchema = z.object({
  status: z.enum(APPLICATION_STATUS_VALUES).optional(),
});
