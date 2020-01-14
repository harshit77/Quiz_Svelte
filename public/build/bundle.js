
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
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
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    const progress = tweened(0, {
                duration: 400,
                easing: cubicOut
            });

    function shuffles(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    function htmlDecode(input) {
        const e = document.createElement('textarea');
        e.innerHTML = input;
        return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue;
      }

    /* src/QuizHeader.svelte generated by Svelte v3.16.7 */
    const file = "src/QuizHeader.svelte";

    function create_fragment(ctx) {
    	let header;
    	let div0;
    	let span;
    	let t0_value = /*name*/ ctx[0].toUpperCase() + "";
    	let t0;
    	let t1;
    	let div3;
    	let div1;
    	let t3;
    	let div2;
    	let progress_1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");
    			div1.textContent = "Total Test Completed";
    			t3 = space();
    			div2 = element("div");
    			progress_1 = element("progress");
    			attr_dev(span, "class", "usernameIndicator svelte-1n1bbhl");
    			add_location(span, file, 37, 7, 706);
    			attr_dev(div0, "class", "userName svelte-1n1bbhl");
    			add_location(div0, file, 36, 4, 676);
    			add_location(div1, file, 40, 8, 795);
    			progress_1.value = /*$progress*/ ctx[1];
    			attr_dev(progress_1, "class", "svelte-1n1bbhl");
    			add_location(progress_1, file, 41, 13, 841);
    			add_location(div2, file, 41, 8, 836);
    			add_location(div3, file, 39, 4, 781);
    			attr_dev(header, "class", "svelte-1n1bbhl");
    			add_location(header, file, 35, 0, 663);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div0);
    			append_dev(div0, span);
    			append_dev(div0, t0);
    			append_dev(header, t1);
    			append_dev(header, div3);
    			append_dev(div3, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, progress_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1 && t0_value !== (t0_value = /*name*/ ctx[0].toUpperCase() + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*$progress*/ 2) {
    				prop_dev(progress_1, "value", /*$progress*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
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

    function instance($$self, $$props, $$invalidate) {
    	let $progress;
    	validate_store(progress, "progress");
    	component_subscribe($$self, progress, $$value => $$invalidate(1, $progress = $$value));
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<QuizHeader> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name, $progress };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("$progress" in $$props) progress.set($progress = $$props.$progress);
    	};

    	return [name, $progress];
    }

    class QuizHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QuizHeader",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<QuizHeader> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<QuizHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<QuizHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Notification.svelte generated by Svelte v3.16.7 */

    const file$1 = "src/Notification.svelte";

    // (26:0) {:else}
    function create_else_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "InCorrect";
    			attr_dev(div, "class", "incorrect svelte-jto66e");
    			add_location(div, file$1, 26, 0, 405);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(26:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if message}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Correct";
    			attr_dev(div, "class", "correct svelte-jto66e");
    			add_location(div, file$1, 22, 0, 356);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(22:0) {#if message}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*message*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	let { message } = $$props;
    	const writable_props = ["message"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Notification> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	$$self.$capture_state = () => {
    		return { message };
    	};

    	$$self.$inject_state = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	return [message];
    }

    class Notification extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { message: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Notification",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*message*/ ctx[0] === undefined && !("message" in props)) {
    			console.warn("<Notification> was created without expected prop 'message'");
    		}
    	}

    	get message() {
    		throw new Error("<Notification>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<Notification>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Login.svelte generated by Svelte v3.16.7 */
    const file$2 = "src/Login.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let label;
    	let t0;
    	let input;
    	let t1;
    	let div0;
    	let button;
    	let t2;
    	let button_disabled_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label = element("label");
    			t0 = text("Username:");
    			input = element("input");
    			t1 = space();
    			div0 = element("div");
    			button = element("button");
    			t2 = text("Proceed");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1idnnxc");
    			add_location(input, file$2, 29, 38, 573);
    			attr_dev(label, "class", "fullWidth svelte-1idnnxc");
    			add_location(label, file$2, 29, 4, 539);
    			button.disabled = button_disabled_value = /*username*/ ctx[0] === "" ? "disbaled" : "";
    			add_location(button, file$2, 30, 35, 660);
    			attr_dev(div0, "class", "proceed fullWidth svelte-1idnnxc");
    			add_location(div0, file$2, 30, 4, 629);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$2, 28, 0, 511);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    				listen_dev(button, "click", /*proceed*/ ctx[1], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label);
    			append_dev(label, t0);
    			append_dev(label, input);
    			set_input_value(input, /*username*/ ctx[0]);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(button, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input.value !== /*username*/ ctx[0]) {
    				set_input_value(input, /*username*/ ctx[0]);
    			}

    			if (dirty & /*username*/ 1 && button_disabled_value !== (button_disabled_value = /*username*/ ctx[0] === "" ? "disbaled" : "")) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let username = "";
    	const dispatch = createEventDispatcher();

    	function proceed() {
    		dispatch("message", { name: username });
    	}

    	function input_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    	};

    	return [username, proceed, dispatch, input_input_handler];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Quiz.svelte generated by Svelte v3.16.7 */
    const file$3 = "src/Quiz.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (142:8) {:else}
    function create_else_block$1(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Fetching Questions....";
    			add_location(h1, file$3, 142, 8, 4290);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(142:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (138:31) 
    function create_if_block_3(ctx) {
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let t4;
    	let div2;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "You're Score is";
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*score*/ ctx[4]);
    			t3 = text(" / 10");
    			t4 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "ReTake";
    			attr_dev(div0, "class", "resultScreen svelte-11yh3xw");
    			add_location(div0, file$3, 138, 12, 4061);
    			attr_dev(div1, "class", "score svelte-11yh3xw");
    			add_location(div1, file$3, 139, 12, 4122);
    			add_location(button, file$3, 140, 34, 4195);
    			attr_dev(div2, "class", "retake svelte-11yh3xw");
    			add_location(div2, file$3, 140, 12, 4173);
    			dispose = listen_dev(button, "click", prevent_default(handleRetake), false, true, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, button);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*score*/ 16) set_data_dev(t2, /*score*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(138:31) ",
    		ctx
    	});

    	return block;
    }

    // (121:8) {#if userResponses.length!==0 && !resultScreen}
    function create_if_block_1(ctx) {
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let t2_value = /*questionNo*/ ctx[0] + 1 + "";
    	let t2;
    	let t3;
    	let div1;
    	let t4_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].difficulty + "";
    	let t4;
    	let t5;
    	let div3;
    	let span;
    	let t7;
    	let t8_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].category + "";
    	let t8;
    	let t9;
    	let div4;
    	let t10_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].question + "";
    	let t10;
    	let t11;
    	let t12;
    	let div6;
    	let div5;
    	let t13;
    	let button;
    	let current;
    	let dispose;

    	const quizheader = new QuizHeader({
    			props: { name: /*username*/ ctx[3] },
    			$$inline: true
    		});

    	let each_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].answerChocies;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*notficationBox*/ ctx[5] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			create_component(quizheader.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t1 = text("Question ");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			span = element("span");
    			span.textContent = "Category:";
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			div4 = element("div");
    			t10 = text(t10_value);
    			t11 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t12 = space();
    			div6 = element("div");
    			div5 = element("div");
    			if (if_block) if_block.c();
    			t13 = space();
    			button = element("button");
    			button.textContent = "Next";
    			attr_dev(div0, "class", "questionText svelte-11yh3xw");
    			add_location(div0, file$3, 123, 12, 3153);
    			attr_dev(div1, "class", "questionDifficulty svelte-11yh3xw");
    			add_location(div1, file$3, 124, 12, 3221);
    			attr_dev(div2, "class", "questionNo");
    			add_location(div2, file$3, 122, 8, 3116);
    			attr_dev(span, "class", "category svelte-11yh3xw");
    			add_location(span, file$3, 126, 13, 3330);
    			add_location(div3, file$3, 126, 8, 3325);
    			add_location(div4, file$3, 127, 8, 3421);
    			attr_dev(div5, "class", "nextAction svelte-11yh3xw");
    			add_location(div5, file$3, 132, 16, 3748);
    			add_location(button, file$3, 136, 16, 3940);
    			add_location(div6, file$3, 131, 12, 3726);
    			dispose = listen_dev(button, "click", prevent_default(/*handleButtonOperation*/ ctx[10]), false, true, false);
    		},
    		m: function mount(target, anchor) {
    			mount_component(quizheader, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, span);
    			append_dev(div3, t7);
    			append_dev(div3, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, t10);
    			insert_dev(target, t11, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t12, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			if (if_block) if_block.m(div5, null);
    			append_dev(div6, t13);
    			append_dev(div6, button);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const quizheader_changes = {};
    			if (dirty & /*username*/ 8) quizheader_changes.name = /*username*/ ctx[3];
    			quizheader.$set(quizheader_changes);
    			if ((!current || dirty & /*questionNo*/ 1) && t2_value !== (t2_value = /*questionNo*/ ctx[0] + 1 + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*userResponses, questionNo*/ 129) && t4_value !== (t4_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].difficulty + "")) set_data_dev(t4, t4_value);
    			if ((!current || dirty & /*userResponses, questionNo*/ 129) && t8_value !== (t8_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].category + "")) set_data_dev(t8, t8_value);
    			if ((!current || dirty & /*userResponses, questionNo*/ 129) && t10_value !== (t10_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].question + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*userResponses, questionNo, userSelection, handleClick*/ 645) {
    				each_value = /*userResponses*/ ctx[7][/*questionNo*/ ctx[0]].answerChocies;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t12.parentNode, t12);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*notficationBox*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div5, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(quizheader.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(quizheader.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(quizheader, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t11);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div6);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(121:8) {#if userResponses.length!==0 && !resultScreen}",
    		ctx
    	});

    	return block;
    }

    // (118:4) {#if loginScreen}
    function create_if_block$1(ctx) {
    	let current;
    	const login = new Login({ $$inline: true });
    	login.$on("message", /*userName*/ ctx[11]);

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(118:4) {#if loginScreen}",
    		ctx
    	});

    	return block;
    }

    // (129:12) {#each userResponses[questionNo].answerChocies as answerChoice}
    function create_each_block(ctx) {
    	let label;
    	let input;
    	let input_value_value;
    	let t_value = /*answerChoice*/ ctx[15] + "";
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t = text(t_value);
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*answerChoice*/ ctx[15];
    			input.value = input.__value;
    			attr_dev(input, "class", "svelte-11yh3xw");
    			/*$$binding_groups*/ ctx[14][0].push(input);
    			add_location(input, file$3, 129, 34, 3579);
    			attr_dev(label, "class", "choice svelte-11yh3xw");
    			add_location(label, file$3, 129, 12, 3557);

    			dispose = [
    				listen_dev(input, "change", /*input_change_handler*/ ctx[13]),
    				listen_dev(input, "click", /*handleClick*/ ctx[9], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = input.__value === /*userSelection*/ ctx[2];
    			append_dev(label, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*userResponses, questionNo*/ 129 && input_value_value !== (input_value_value = /*answerChoice*/ ctx[15])) {
    				prop_dev(input, "__value", input_value_value);
    			}

    			input.value = input.__value;

    			if (dirty & /*userSelection*/ 4) {
    				input.checked = input.__value === /*userSelection*/ ctx[2];
    			}

    			if (dirty & /*userResponses, questionNo*/ 129 && t_value !== (t_value = /*answerChoice*/ ctx[15] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*$$binding_groups*/ ctx[14][0].splice(/*$$binding_groups*/ ctx[14][0].indexOf(input), 1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(129:12) {#each userResponses[questionNo].answerChocies as answerChoice}",
    		ctx
    	});

    	return block;
    }

    // (133:43) {#if notficationBox}
    function create_if_block_2(ctx) {
    	let current;

    	const notification = new Notification({
    			props: { message: /*notficationMessage*/ ctx[6] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(notification.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(notification, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const notification_changes = {};
    			if (dirty & /*notficationMessage*/ 64) notification_changes.message = /*notficationMessage*/ ctx[6];
    			notification.$set(notification_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(notification.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(notification.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(notification, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(133:43) {#if notficationBox}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_if_block_1, create_if_block_3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loginScreen*/ ctx[1]) return 0;
    		if (/*userResponses*/ ctx[7].length !== 0 && !/*resultScreen*/ ctx[8]) return 1;
    		if (/*resultScreen*/ ctx[8]) return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "container");
    			add_location(div, file$3, 116, 0, 2921);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
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

    function handleRetake() {
    	window.location.href = "/";
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let data;
    	let questionNo = 0;
    	let loginScreen = true;
    	let userSelection;
    	let username = "";
    	let score = 0;
    	let notficationBox = false;
    	let notficationMessage = false;
    	let userResponses = [];
    	let resultScreen = false;

    	onMount(async () => {
    		const response = await fetch("http://www.json-generator.com/api/json/get/cftWfSJxAi?indent=2");
    		const result = await response.json();
    		data = result.results;

    		$$invalidate(7, userResponses = data.map(userResponse => {
    			return {
    				question: htmlDecode(userResponse.question),
    				correctAnswer: userResponse.correct_answer,
    				answerChocies: shuffles([...userResponse.incorrect_answers, userResponse.correct_answer].map(ans => htmlDecode(ans))),
    				category: userResponse.category,
    				difficulty: userResponse.difficulty,
    				answerByUser: "",
    				correct: false,
    				answered: false
    			};
    		}));
    	});

    	function handleClick(e) {
    		let userResponseCopy = { ...userResponses[questionNo] };

    		if (e.target.value === userResponses[questionNo].correctAnswer) {
    			userResponseCopy.correct = true;
    			userResponseCopy.answered = true;
    			userResponseCopy.answerByUser = userResponses[questionNo].correctAnswer;
    			$$invalidate(7, userResponses[questionNo] = userResponseCopy, userResponses);
    			$$invalidate(4, score += 1);
    			$$invalidate(6, notficationMessage = true);
    		} else {
    			userResponseCopy.correct = false;
    			userResponseCopy.answered = true;
    			userResponseCopy.answerByUser = e.target.value;
    			$$invalidate(7, userResponses[questionNo] = userResponseCopy, userResponses);
    			$$invalidate(6, notficationMessage = false);
    		}

    		if (!notficationBox) $$invalidate(5, notficationBox = true);
    	}

    	function handleButtonOperation(e) {
    		$$invalidate(2, userSelection = "");
    		if (notficationBox) $$invalidate(5, notficationBox = !notficationBox);
    		progress.set((questionNo + 1) / userResponses.length);
    		if (userResponses.length > questionNo + 1) $$invalidate(0, questionNo += 1); else $$invalidate(8, resultScreen = true);
    	}

    	function userName(event) {
    		$$invalidate(3, username = event.detail.name.toUpperCase());
    		$$invalidate(1, loginScreen = false);
    	}

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		userSelection = this.__value;
    		$$invalidate(2, userSelection);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) data = $$props.data;
    		if ("questionNo" in $$props) $$invalidate(0, questionNo = $$props.questionNo);
    		if ("loginScreen" in $$props) $$invalidate(1, loginScreen = $$props.loginScreen);
    		if ("userSelection" in $$props) $$invalidate(2, userSelection = $$props.userSelection);
    		if ("username" in $$props) $$invalidate(3, username = $$props.username);
    		if ("score" in $$props) $$invalidate(4, score = $$props.score);
    		if ("notficationBox" in $$props) $$invalidate(5, notficationBox = $$props.notficationBox);
    		if ("notficationMessage" in $$props) $$invalidate(6, notficationMessage = $$props.notficationMessage);
    		if ("userResponses" in $$props) $$invalidate(7, userResponses = $$props.userResponses);
    		if ("resultScreen" in $$props) $$invalidate(8, resultScreen = $$props.resultScreen);
    	};

    	return [
    		questionNo,
    		loginScreen,
    		userSelection,
    		username,
    		score,
    		notficationBox,
    		notficationMessage,
    		userResponses,
    		resultScreen,
    		handleClick,
    		handleButtonOperation,
    		userName,
    		data,
    		input_change_handler,
    		$$binding_groups
    	];
    }

    class Quiz extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Quiz",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.7 */
    const file$4 = "src/App.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p;
    	let t4;
    	let a;
    	let t6;
    	let t7;
    	let current;
    	const quiz = new Quiz({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p = element("p");
    			t4 = text("Visit the ");
    			a = element("a");
    			a.textContent = "Svelte tutorial";
    			t6 = text(" to learn how to build Svelte apps.");
    			t7 = space();
    			create_component(quiz.$$.fragment);
    			attr_dev(h1, "class", "svelte-17wlmhb");
    			add_location(h1, file$4, 7, 1, 83);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			add_location(a, file$4, 8, 14, 120);
    			add_location(p, file$4, 8, 1, 107);
    			attr_dev(main, "class", "svelte-17wlmhb");
    			add_location(main, file$4, 6, 0, 75);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			append_dev(main, p);
    			append_dev(p, t4);
    			append_dev(p, a);
    			append_dev(p, t6);
    			append_dev(main, t7);
    			mount_component(quiz, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(quiz.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(quiz.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(quiz);
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
    	let { name } = $$props;
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
