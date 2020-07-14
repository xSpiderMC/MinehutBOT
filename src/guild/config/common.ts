import { PermissionLevel } from '../../util/permission/permissionLevel';

export const ALL_MODLOG_EVENTS = [
	'memberJoin', //added
	'memberLeave', //added
	'memberUserNameUpdate', //added
	'memberNickNameUpdate', //added
	'messageDelete', //added
	'messageEdit', //added
	'messageCensor',
	'caseCreate', //added
	'caseDelete', //added
	'caseReasonUpdate', //added
	'caseDurationUpdate', //added
	'memberRolesUpdate', //added
	'command', //added
];

export const CENSOR_BYPASS_PERMISSION_LEVEL = PermissionLevel.JuniorModerator;
export const INVITE_WHITELIST = [
	'239599059415859200', // Minehut
	'546414872196415501', // Minehut Meta
	'405124395401609218', // Super League Gaming Official
	'302094807046684672', // MINECRAFT

	'608978588976283660', // Bot testing
];
