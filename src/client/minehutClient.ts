import { AkairoClient, CommandHandler, ListenerHandler } from 'discord-akairo';
import { MinehutClientOptions } from './minehutClientOptions';
import { Mongoose } from 'mongoose';
import { Message } from 'discord.js';
import { InhibitorHandler } from 'discord-akairo';
import { guildConfigs } from '../guild/config/guildConfigs';
import { CaseModel } from '../model/case';
import parseDuration from 'parse-duration';
import { BanScheduler } from '../structure/scheduler/banScheduler';
import { MuteScheduler } from '../structure/scheduler/muteScheduler';
import { CooldownManager } from '../structure/cooldownManager';
import MinehutClientEvents from './minehutClientEvents';

import { Minehut } from 'minehut';
import { FOREVER_MS, MESSAGES } from '../util/constants';
import { Argument } from 'discord-akairo';
import { GuildMember } from 'discord.js';
import { BoosterPassModel } from '../model/boosterPass';
import { CacheManager } from '../structure/cacheManager';

import { OctokitResponse, IssuesGetResponseData } from '@octokit/types';

export class MinehutClient extends AkairoClient {
	commandHandler: CommandHandler;
	listenerHandler: ListenerHandler;
	inhibitorHandler: InhibitorHandler;

	banScheduler: BanScheduler;
	muteScheduler: MuteScheduler;

	tagCooldownManager: CooldownManager;
	hastebinCooldownManager: CooldownManager;
	githubCooldownManager: CooldownManager;
	starboardCooldownManager: CooldownManager;
  
	githubCacheManager: CacheManager<number, any>;

	minehutApi: Minehut;

	ownerIds: string[] | undefined;
	mongo?: Mongoose;

	constructor(options: MinehutClientOptions) {
		// TODO: validate options

		super(
			{
				ownerID: options.ownerIds,
			},
			{
				disableMentions: 'everyone',
			}
		);

		this.ownerIds = options.ownerIds;
		this.mongo = options.mongo;

		this.commandHandler = new CommandHandler(this, {
			directory: './src/command/',
			prefix: (msg: Message) => {
				if (!msg.guild) return options.prefix!;
				const config = guildConfigs.get(msg.guild.id);
				return config ? config.prefix || options.prefix! : options.prefix!;
			},
			argumentDefaults: {
				prompt: {
					modifyRetry: (_, str) =>
						MESSAGES.commandHandler.prompt.modifyRetry(str),
					modifyStart: (_, str) =>
						MESSAGES.commandHandler.prompt.modifyStart(str),
					timeout: MESSAGES.commandHandler.prompt.timeout,
					ended: MESSAGES.commandHandler.prompt.ended,
					cancel: MESSAGES.commandHandler.prompt.cancel,
					retries: 3,
					time: 30000,
				},
			},
			commandUtil: true,
			allowMention: true,
		});

		this.listenerHandler = new ListenerHandler(this, {
			directory: './src/listener/',
		});

		this.inhibitorHandler = new InhibitorHandler(this, {
			directory: './src/inhibitor/',
		});

		this.listenerHandler.setEmitters({
			commandHandler: this.commandHandler,
			listenerHandler: this.listenerHandler,
		});

		this.commandHandler.useListenerHandler(this.listenerHandler);
		// this.commandHandler.useInhibitorHandler(this.inhibitorHandler);

		this.listenerHandler.loadAll();
		this.commandHandler.loadAll();
		// this.inhibitorHandler.loadAll();

		this.banScheduler = new BanScheduler(this);
		this.muteScheduler = new MuteScheduler(this);

		this.tagCooldownManager = new CooldownManager(10000);
		this.hastebinCooldownManager = new CooldownManager(10000);
		this.githubCooldownManager = new CooldownManager(10000);
		this.starboardCooldownManager = new CooldownManager(10000);

		this.githubCacheManager = new CacheManager(600000);

		this.minehutApi = new Minehut();

		this.registerArgTypes();
	}

	start(token: string) {
		super.login(token);
	}

	registerArgTypes() {
		this.commandHandler.resolver.addType('handler', (_msg: Message, phrase) => {
			if (!phrase) return null;
			switch (phrase.toLowerCase()) {
				case 'cmd':
				case 'command':
					return this.commandHandler;

				case 'listener':
				case 'event':
					return this.listenerHandler;

				case 'block':
				case 'check':
				case 'inhibitor':
					return this.inhibitorHandler;

				default:
					return null;
			}
		});

		this.commandHandler.resolver.addType(
			'caseId',
			async (_msg: Message, phrase) => {
				if (!phrase) return null;

				const c = await CaseModel.findOne({ _id: phrase });
				if (!c) return null;
				return c;
			}
		);

		this.commandHandler.resolver.addType(
			'duration',
			(_msg: Message, phrase) => {
				if (
					['p', 'forever', 'permanent', 'perm'].includes(phrase.toLowerCase())
				)
					return FOREVER_MS;
				const parsed = parseDuration(phrase);
				return parsed;
			}
		);

		this.commandHandler.resolver.addType('announcer', (msg, phrase) => {
			const config = guildConfigs.get(msg.guild!.id);
			if (config && config.features.announcement)
				return (
					config.features.announcement.announcers.find(
						a => a.name === phrase.toLowerCase()
					) || null
				);
			return null;
		});

		this.commandHandler.resolver.addType(
			'boosterPassReceived',
			async (msg, phrase) => {
				let id = phrase;
				// attempt to cast as a member and use the member type to get the id that way
				const member: GuildMember = await Argument.cast(
					'member',
					this.commandHandler.resolver,
					msg,
					phrase
				);
				if (!Argument.isFailure(member))
					id = member.id;
				const grantedBoosterPasses = await BoosterPassModel.getGrantedByMember(
					msg.member!
				);
				const boosterPassReceived = grantedBoosterPasses.find(
					bp => bp.grantedId === id
				);
				return boosterPassReceived;
			}
		);
	}
}

declare module 'discord-akairo' {
	interface AkairoClient {
		commandHandler: CommandHandler;
		listenerHandler: ListenerHandler;
		inhibitorHandler: InhibitorHandler;
		ownerIds: string[] | undefined;
		banScheduler: BanScheduler;
		muteScheduler: MuteScheduler;
		tagCooldownManager: CooldownManager;
		hastebinCooldownManager: CooldownManager;
		githubCooldownManager: CooldownManager;
		starboardCooldownManager:CooldownManager;
		githubCacheManager: CacheManager<
			number,
			Promise<OctokitResponse<IssuesGetResponseData>>
		>;
		minehutApi: Minehut;

		start(token: string): void;
		registerArgTypes(): void;

		on<K extends keyof MinehutClientEvents>(
			event: K,
			listener: (...args: MinehutClientEvents[K]) => void
		): this;

		once<K extends keyof MinehutClientEvents>(
			event: K,
			listener: (...args: MinehutClientEvents[K]) => void
		): this;

		emit<K extends keyof MinehutClientEvents>(
			event: K,
			...args: MinehutClientEvents[K]
		): boolean;
	}
}
