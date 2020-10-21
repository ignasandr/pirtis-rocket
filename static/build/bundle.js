
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\OneTrack.svelte generated by Svelte v3.29.0 */

    const file = "src\\OneTrack.svelte";

    function create_fragment(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t;
    	let audio_1;
    	let track;
    	let audio_1_src_value;
    	let audio_1_is_paused = true;
    	let div_id_value;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			audio_1 = element("audio");
    			track = element("track");
    			if (img.src !== (img_src_value = /*imgPath*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "phones");
    			attr_dev(img, "class", "svelte-5ywlhe");
    			add_location(img, file, 28, 4, 574);
    			attr_dev(track, "kind", "captions");
    			add_location(track, file, 34, 8, 757);
    			if (audio_1.src !== (audio_1_src_value = /*audioPath*/ ctx[2])) attr_dev(audio_1, "src", audio_1_src_value);
    			add_location(audio_1, file, 29, 4, 637);
    			attr_dev(div, "id", div_id_value = "track" + /*id*/ ctx[0]);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(/*active*/ ctx[3] ? "OneTrack active" : "OneTrack") + " svelte-5ywlhe"));
    			add_location(div, file, 27, 0, 489);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    			append_dev(div, audio_1);
    			append_dev(audio_1, track);
    			/*audio_1_binding*/ ctx[9](audio_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img, "click", /*startPlaying*/ ctx[7], false, false, false),
    					listen_dev(audio_1, "play", /*audio_1_play_pause_handler*/ ctx[10]),
    					listen_dev(audio_1, "pause", /*audio_1_play_pause_handler*/ ctx[10]),
    					listen_dev(audio_1, "play", /*stopOthers*/ ctx[6], false, false, false),
    					listen_dev(div, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imgPath*/ 2 && img.src !== (img_src_value = /*imgPath*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*audioPath*/ 4 && audio_1.src !== (audio_1_src_value = /*audioPath*/ ctx[2])) {
    				attr_dev(audio_1, "src", audio_1_src_value);
    			}

    			if (dirty & /*paused*/ 32 && audio_1_is_paused !== (audio_1_is_paused = /*paused*/ ctx[5])) {
    				audio_1[audio_1_is_paused ? "pause" : "play"]();
    			}

    			if (dirty & /*id*/ 1 && div_id_value !== (div_id_value = "track" + /*id*/ ctx[0])) {
    				attr_dev(div, "id", div_id_value);
    			}

    			if (dirty & /*active*/ 8 && div_class_value !== (div_class_value = "" + (null_to_empty(/*active*/ ctx[3] ? "OneTrack active" : "OneTrack") + " svelte-5ywlhe"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*audio_1_binding*/ ctx[9](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let current;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OneTrack", slots, []);

    	let { id } = $$props,
    		{ imgPath } = $$props,
    		{ audioPath } = $$props,
    		{ active } = $$props;

    	let audio;
    	let paused = true;

    	function stopOthers() {
    		if (current && current !== audio) current.pause();
    		current = audio;
    	}

    	function startPlaying() {
    		if (paused) {
    			$$invalidate(4, audio.currentTime = 0, audio);
    			audio.play();
    		} else {
    			audio.pause();
    		}
    	}

    	const writable_props = ["id", "imgPath", "audioPath", "active"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OneTrack> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function audio_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			audio = $$value;
    			$$invalidate(4, audio);
    		});
    	}

    	function audio_1_play_pause_handler() {
    		paused = this.paused;
    		$$invalidate(5, paused);
    	}

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("imgPath" in $$props) $$invalidate(1, imgPath = $$props.imgPath);
    		if ("audioPath" in $$props) $$invalidate(2, audioPath = $$props.audioPath);
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({
    		current,
    		id,
    		imgPath,
    		audioPath,
    		active,
    		audio,
    		paused,
    		stopOthers,
    		startPlaying
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("imgPath" in $$props) $$invalidate(1, imgPath = $$props.imgPath);
    		if ("audioPath" in $$props) $$invalidate(2, audioPath = $$props.audioPath);
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    		if ("audio" in $$props) $$invalidate(4, audio = $$props.audio);
    		if ("paused" in $$props) $$invalidate(5, paused = $$props.paused);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		id,
    		imgPath,
    		audioPath,
    		active,
    		audio,
    		paused,
    		stopOthers,
    		startPlaying,
    		click_handler,
    		audio_1_binding,
    		audio_1_play_pause_handler
    	];
    }

    class OneTrack extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			id: 0,
    			imgPath: 1,
    			audioPath: 2,
    			active: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OneTrack",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !("id" in props)) {
    			console.warn("<OneTrack> was created without expected prop 'id'");
    		}

    		if (/*imgPath*/ ctx[1] === undefined && !("imgPath" in props)) {
    			console.warn("<OneTrack> was created without expected prop 'imgPath'");
    		}

    		if (/*audioPath*/ ctx[2] === undefined && !("audioPath" in props)) {
    			console.warn("<OneTrack> was created without expected prop 'audioPath'");
    		}

    		if (/*active*/ ctx[3] === undefined && !("active" in props)) {
    			console.warn("<OneTrack> was created without expected prop 'active'");
    		}
    	}

    	get id() {
    		throw new Error("<OneTrack>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<OneTrack>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imgPath() {
    		throw new Error("<OneTrack>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imgPath(value) {
    		throw new Error("<OneTrack>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get audioPath() {
    		throw new Error("<OneTrack>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set audioPath(value) {
    		throw new Error("<OneTrack>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<OneTrack>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<OneTrack>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Tracks.svelte generated by Svelte v3.29.0 */
    const file$1 = "src\\Tracks.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (21:4) {#each tracks as track}
    function create_each_block(ctx) {
    	let onetrack;
    	let current;

    	const onetrack_spread_levels = [
    		/*track*/ ctx[4],
    		{
    			active: /*track*/ ctx[4].id === /*current*/ ctx[0]
    		}
    	];

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[3](/*track*/ ctx[4], ...args);
    	}

    	let onetrack_props = {};

    	for (let i = 0; i < onetrack_spread_levels.length; i += 1) {
    		onetrack_props = assign(onetrack_props, onetrack_spread_levels[i]);
    	}

    	onetrack = new OneTrack({ props: onetrack_props, $$inline: true });
    	onetrack.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			create_component(onetrack.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(onetrack, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			const onetrack_changes = (dirty & /*tracks, current*/ 3)
    			? get_spread_update(onetrack_spread_levels, [
    					dirty & /*tracks*/ 2 && get_spread_object(/*track*/ ctx[4]),
    					{
    						active: /*track*/ ctx[4].id === /*current*/ ctx[0]
    					}
    				])
    			: {};

    			onetrack.$set(onetrack_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(onetrack.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(onetrack.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(onetrack, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(21:4) {#each tracks as track}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let each_value = /*tracks*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "tracks svelte-1c3807o");
    			add_location(div, file$1, 19, 0, 704);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tracks, current, handleClick*/ 7) {
    				each_value = /*tracks*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tracks", slots, []);

    	let tracks = [
    		{
    			id: 1,
    			imgPath: "./img/phones/ausine1.png",
    			audioPath: "./mp3/1.mp3"
    		},
    		{
    			id: 2,
    			imgPath: "./img/phones/ausine2.png",
    			audioPath: "./mp3/2.mp3"
    		},
    		{
    			id: 3,
    			imgPath: "./img/phones/ausine3.png",
    			audioPath: "./mp3/3.mp3"
    		},
    		{
    			id: 4,
    			imgPath: "./img/phones/ausine4.png",
    			audioPath: "./mp3/4.mp3"
    		},
    		{
    			id: 5,
    			imgPath: "./img/phones/ausine5.png",
    			audioPath: "./mp3/5.mp3"
    		},
    		{
    			id: 6,
    			imgPath: "./img/phones/ausine6.png",
    			audioPath: "./mp3/6.mp3"
    		}
    	];

    	let current = 0;

    	function handleClick(id) {
    		id === current
    		? $$invalidate(0, current = 0)
    		: $$invalidate(0, current = id);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tracks> was created with unknown prop '${key}'`);
    	});

    	const click_handler = track => handleClick(track.id);
    	$$self.$capture_state = () => ({ OneTrack, tracks, current, handleClick });

    	$$self.$inject_state = $$props => {
    		if ("tracks" in $$props) $$invalidate(1, tracks = $$props.tracks);
    		if ("current" in $$props) $$invalidate(0, current = $$props.current);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [current, tracks, handleClick, click_handler];
    }

    class Tracks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tracks",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\About.svelte generated by Svelte v3.29.0 */

    const file$2 = "src\\About.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let p0;
    	let t0;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let t5;
    	let p1;
    	let t7;
    	let p2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("„AUDIO PIRTIS” – tai lietuviškos pirties patirtis garsais. Pirtys - kupinos unikalių garsų, kurie persipina su\r\n        nuoširdžiomis žmonių emocijomis. Projekto autorės Karolina Latvytė-Bibiano ir Judita Ragauskaitė,\r\n        siekdamos įamažinti šiuos patyrimus, kartu su vietos pirtininkais įrašė būtent mūsų, lietuviškai pirčiai\r\n        būdingas ceremonijas. Šiuos garsus menininkės sudėjo į šešis audio takelius, kuriais keliaudami galite\r\n        atrasti tikrąją lietuviškos pirties dvasią. Projektas yra ");
    			a0 = element("a");
    			a0.textContent = "magiccarpets.eu";
    			t2 = text(" ir ");
    			a1 = element("a");
    			a1.textContent = "kaunasbiennal";
    			t4 = text(" dalis.");
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Dėkojame: Giedriui Bučiui, Astai Bučienei, Ilonai Latvei ir visiems pirties bičiuliams, kurie prisidėjo prie\r\n        projekto.";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "Partneriai: „Kaunas 3022”, „Ten kur gera”";
    			attr_dev(a0, "href", "https://magiccarpets.eu");
    			attr_dev(a0, "class", "svelte-50o44f");
    			add_location(a0, file$2, 6, 66, 572);
    			attr_dev(a1, "href", "https://bienale.lt/2021/");
    			attr_dev(a1, "class", "svelte-50o44f");
    			add_location(a1, file$2, 6, 123, 629);
    			add_location(p0, file$2, 2, 8, 58);
    			add_location(p1, file$2, 7, 8, 702);
    			add_location(p2, file$2, 9, 8, 846);
    			attr_dev(div0, "class", "container svelte-50o44f");
    			add_location(div0, file$2, 1, 4, 25);
    			attr_dev(div1, "class", "about svelte-50o44f");
    			add_location(div1, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t0);
    			append_dev(p0, a0);
    			append_dev(p0, t2);
    			append_dev(p0, a1);
    			append_dev(p0, t4);
    			append_dev(div0, t5);
    			append_dev(div0, p1);
    			append_dev(div0, t7);
    			append_dev(div0, p2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Sponsors.svelte generated by Svelte v3.29.0 */

    const file$3 = "src\\Sponsors.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img0 = element("img");
    			t0 = space();
    			img1 = element("img");
    			t1 = space();
    			img2 = element("img");
    			t2 = space();
    			img3 = element("img");
    			t3 = space();
    			img4 = element("img");
    			if (img0.src !== (img0_src_value = "./img/sponsors/mc.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "magic carpets logo");
    			attr_dev(img0, "class", "svelte-17t40kj");
    			add_location(img0, file$3, 1, 4, 28);
    			if (img1.src !== (img1_src_value = "./img/sponsors/lkt.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "lietuvos kulturos taryba logo");
    			attr_dev(img1, "class", "svelte-17t40kj");
    			add_location(img1, file$3, 2, 4, 93);
    			if (img2.src !== (img2_src_value = "./img/sponsors/bienale.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "bienale logo");
    			attr_dev(img2, "class", "svelte-17t40kj");
    			add_location(img2, file$3, 3, 4, 170);
    			if (img3.src !== (img3_src_value = "./img/sponsors/eu.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "eu logo");
    			attr_dev(img3, "class", "svelte-17t40kj");
    			add_location(img3, file$3, 4, 4, 234);
    			if (img4.src !== (img4_src_value = "./img/sponsors/k3022.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "kaunas 3022 logo");
    			attr_dev(img4, "class", "svelte-17t40kj");
    			add_location(img4, file$3, 5, 4, 288);
    			attr_dev(div, "class", "sponsors svelte-17t40kj");
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img0);
    			append_dev(div, t0);
    			append_dev(div, img1);
    			append_dev(div, t1);
    			append_dev(div, img2);
    			append_dev(div, t2);
    			append_dev(div, img3);
    			append_dev(div, t3);
    			append_dev(div, img4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sponsors", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sponsors> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Sponsors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sponsors",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.29.0 */
    const file$4 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let tracks;
    	let t0;
    	let about;
    	let t1;
    	let sponsors;
    	let current;
    	tracks = new Tracks({ $$inline: true });
    	about = new About({ $$inline: true });
    	sponsors = new Sponsors({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(tracks.$$.fragment);
    			t0 = space();
    			create_component(about.$$.fragment);
    			t1 = space();
    			create_component(sponsors.$$.fragment);
    			attr_dev(main, "class", "svelte-1v7o3zy");
    			add_location(main, file$4, 6, 0, 139);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(tracks, main, null);
    			append_dev(main, t0);
    			mount_component(about, main, null);
    			append_dev(main, t1);
    			mount_component(sponsors, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tracks.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			transition_in(sponsors.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tracks.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(sponsors.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(tracks);
    			destroy_component(about);
    			destroy_component(sponsors);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Tracks, About, Sponsors });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
