import { Message } from 'discord.js';
import { emoji } from '../../util/messages';
import { TagModel, Tag } from '../../model/tag';
import { PrefixSupplier } from 'discord-akairo';
import { MinehutCommand } from '../../structure/command/minehutCommand';
import { PermissionLevel } from '../../util/permission/permissionLevel';

export default class TagSetCommand extends MinehutCommand {
	constructor() {
		super('tag-set', {
			permissionLevel: PermissionLevel.Support,
			category: 'tag',
			channel: 'guild',
			description: {
				content: 'Set/edit a tag',
				usage: '<name> <content>',
			},
			args: [
				{
					id: 'name',
					type: 'string',
					prompt: {
						start: (msg: Message) =>
							`${msg.author}, what should the tag be called? (spaces allowed)`,
					},
				},
				{
					id: 'content',
					type: 'string',
					match: 'rest',
					prompt: {
						start: (msg: Message) =>
							`${msg.author}, what should the tag's content be?`,
					},
				},
			],
		});
	}

	async exec(
		msg: Message,
		{ name, content }: { name: string; content: string }
	) {
		name = name.replace(/\s+/g, '-').toLowerCase();
		const prefix = (this.handler.prefix as PrefixSupplier)(msg) as string;
		const tag = {
			name,
			content,
			author: msg.author.id,
			guild: msg.guild!.id,
		} as Tag;
		const conflictingTag = await TagModel.findByAlias(tag.name, msg.guild!.id);
		if (conflictingTag)
			return msg.channel.send(
				`${emoji.cross} tag name conflicts with \`${conflictingTag.name}\`'s aliases (use ${prefix}tag info ${conflictingTag.name})`
			);
		if (!(await TagModel.exists({ name, guild: msg.guild!.id }))) {
			TagModel.create(tag);
			return msg.channel.send(`${emoji.check} tag \`${tag.name}\` created`);
		} else await TagModel.updateOne({ name }, tag);
		return msg.channel.send(`${emoji.check} tag \`${tag.name}\` updated`);
	}
}
