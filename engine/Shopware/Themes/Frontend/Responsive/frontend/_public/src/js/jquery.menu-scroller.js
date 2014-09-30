;(function ($, window, modernizr) {
    'use strict';

    /**
     * Shopware Menu Scroller Plugin
     *
     * @example
     *
     * HTML:
     *
     * <div class="container">
     *     <ul class="my--list">
     *         <li>
     *             <!-- Put any element you want in here -->
     *         </li>
     *
     *         <li>
     *             <!-- Put any element you want in here -->
     *         </li>
     *
     *         <!-- More li elements -->
     *     </ul>
     * </div>
     *
     * JS:
     *
     * $('.container').menuScroller();
     */
    $.plugin('menuScroller', {

        /**
         * Default options for the menu scroller plugin
         *
         * @public
         * @property defaults
         * @type {Object}
         */
        defaults: {

            /**
             * CSS selector for the element listing
             *
             * @type {String}
             */
            listSelector: '*[class$="--list"]',

            /**
             * CSS class which will be added to a given viewPort.
             * If no one is defined, the view port will be the list itself.
             *
             * @type {String}
             */
            viewPortSelector: '',

            /**
             * CSS class which will be added to the wrapper / this.$el
             *
             * @type {String}
             */
            wrapperClass: 'js--menu-scroller',

            /**
             * CSS class which will be added to the listing
             *
             * @type {String}
             */
            listClass: 'js--menu-scroller--list',

            /**
             * CSS class which will be added to every list item
             *
             * @type {String}
             */
            itemClass: 'js--menu-scroller--item',

            /**
             * CSS class which will be added to a given view port.
             *
             * @type {String}
             */
            viewPortClass: 'js--menu-scroller--viewport',

            /**
             * CSS class(es) which will be set for the left arrow
             *
             * @type {String}
             */
            leftArrowClass: 'js--menu-scroller--arrow left--arrow',

            /**
             * CSS class(es) which will be set for the right arrow
             *
             * @type {String}
             */
            rightArrowClass: 'js--menu-scroller--arrow right--arrow',

            /**
             * CSS Class for the arrow content to center the arrow text.
             *
             * @type {String}
             */
            arrowContentClass: 'arrow--content',

            /**
             * Content of the left arrow.
             * Default it's an arrow pointing left.
             *
             * @type {String}
             */
            leftArrowContent: '&#58897;',

            /**
             * Content of the right arrow.
             * Default it's an arrow pointing right.
             *
             * @type {String}
             */
            rightArrowContent: '&#58895;',

            /**
             * Amount of pixels the plugin should scroll per arrow click.
             *
             * There is also a additional option:
             *
             * 'auto': the visible width will be taken.
             *
             * @type {String|Number}
             */
            scrollStep: 'auto',

            /**
             * Time in milliseconds the slider needs to take to slide..
             *
             * @type {Number}
             */
            animationSpeed: 500
        },

        /**
         * Default plugin initialisation function.
         * Sets all needed properties, creates the slider template
         * and registers all needed event listeners.
         *
         * @public
         * @method init
         */
        init: function () {
            var me = this;

            /**
             * Current left offset in px.
             *
             * @private
             * @property _offset
             * @type {Number}
             */
            me._offset = 0;

            /**
             * Current summed width of all elements in the list.
             *
             * @private
             * @property _width
             * @type {Number}
             */
            me._width = 0;

            /**
             * Timeout id that will be set in the onWindowResize method..
             *
             * @private
             * @property _resizeTimeout
             * @type {Number}
             */
            me._resizeTimeout = 0;

            // Apply all given data attributes to the options
            me.applyDataAttributes();

            // Initializes the template by adding classes to the existing elements and creating the buttons
            me.initTemplate();

            // Register window resize and button events
            me.registerEvents();

            // applying other styling changes
            me.onWindowResize();
        },

        /**
         * Creates all needed control items and adds plugin classes
         *
         * @public
         * @method initTemplate
         */
        initTemplate: function () {
            var me = this,
                opts = me.opts;

            me.$el.addClass(opts.wrapperClass);

            me.$list = me.$el.find(opts.listSelector);
            me.$list.addClass(opts.listClass);

            me.$viewPort = opts.viewPortSelector.length ? $(opts.viewPortSelector) : me.$list;
            me.$viewPort.addClass(opts.viewPortClass);

            $.each(me.$list.children(), function (index, el) {
                $(el).addClass(opts.itemClass);
            });

            me.$leftArrow = $('<div>', {
                'html': $('<span>', {
                    'class': opts.arrowContentClass,
                    'html': opts.leftArrowContent
                }),
                'class': opts.leftArrowClass
            }).appendTo(me.$el);

            me.$rightArrow = $('<div>', {
                'html': $('<span>', {
                    'class': opts.arrowContentClass,
                    'html': opts.rightArrowContent
                }),
                'class': opts.rightArrowClass
            }).appendTo(me.$el);
        },

        /**
         * Registers the listener for the window resize.
         * Also adds the click/tap listeners for the navigation buttons.
         *
         * @public
         * @method registerEvents
         */
        registerEvents: function () {
            var me = this;

            me.refreshListeners();

            me._on(window, 'resize', $.proxy(me.onWindowResize, me));
        },

        /**
         * Registers click and tap events for the navigation buttons.
         *
         * @public
         * @method refreshListeners
         */
        refreshListeners: function () {
            var me = this;

            me._on(me.$leftArrow, 'click touchstart', $.proxy(me.onLeftArrowClick, me));
            me._on(me.$rightArrow, 'click touchstart', $.proxy(me.onRightArrowClick, me));

            me._on(me.$el, 'swipeleft', $.proxy(me.onRightArrowClick, me));
            me._on(me.$el, 'swiperight', $.proxy(me.onLeftArrowClick, me));

            me._on(me.$el, 'movestart', function(e) {
                if ((e.distX > e.distY && e.distX < -e.distY) ||
                    (e.distX < e.distY && e.distX > -e.distY)) {
                    e.preventDefault();
                }
            });
        },

        onWindowResize: function () {
            var me = this;

            if (me._resizeTimeout) {
                clearTimeout(me._resizeTimeout);
            }

            me._resizeTimeout = window.setTimeout($.proxy(me.updateResize, me), 200);
        },

        /**
         * Will be called when the window resizes.
         * Calculates the new width and scroll step.
         * Refreshes the button states.
         *
         * @public
         * @method updateResize
         */
        updateResize: function () {
            var me = this,
                opts = me.opts,
                viewPortWidth = me.$viewPort.width();

            me._step = opts.scrollStep === 'auto' ? viewPortWidth / 2 : opts.scrollStep;

            me._width = Math.max(viewPortWidth, me.calculateWidth());

            me.setOffset(me._offset);

            me.updateButtons();

            $.publish('plugin/' + me.getName() + '/updateResize', [ me ]);
        },

        /**
         * Returns the sum of all item widths.
         *
         * @public
         * @method calculateWidth
         * @returns {Number}
         */
        calculateWidth: function () {
            var me = this,
                width = 0;

            $.each(me.$list.children(), function (index, el) {
                width += $(el).outerWidth(true);
            });

            return width;
        },

        /**
         * Called when left arrow was clicked / touched.
         * Adds the negated offset step to the offset.
         *
         * @public
         * @param {jQuery.Event} event
         * @method onLeftArrowClick
         */
        onLeftArrowClick: function (event) {
            event.preventDefault();

            var me = this;

            me.addOffset(me._step * -1);

            $.publish('plugin/' + me.getName() + '/onLeftArrowClick', [ me ]);
        },

        /**
         * Called when right arrow was clicked / touched.
         * Adds the offset step to the offset.
         *
         * @public
         * @method onRightArrowClick
         * @param {jQuery.Event} event
         */
        onRightArrowClick: function (event) {
            event.preventDefault();

            var me = this;

            me.addOffset(me._step);

            $.publish('plugin/' + me.getName() + '/onRightArrowClick', [ me ]);
        },

        /**
         * Adds the given offset relatively to the current offset.
         *
         * @public
         * @method addOffset
         * @param {Number} offset
         */
        addOffset: function (offset) {
            var me = this;

            me.setOffset(me._offset + offset);
        },

        /**
         * Sets the absolute scroll offset.
         * Min / Max the offset so the menu stays in bounds.
         *
         * @public
         * @method setOffset
         * @param {Number} offset
         */
        setOffset: function (offset) {
            var me = this,
                maxWidth = me._width - me.$viewPort.width();

            me._offset = Math.max(0, Math.min(maxWidth, offset));

            me.updateButtons();

            if (modernizr.csstransitions) {
                me.$list.stop(true).transition({
                    'left': me._offset * -1
                }, me.opts.animationSpeed);
                return;
            }

            me.$list.stop(true).animate({
                'left': me._offset * -1
            }, me.opts.animationSpeed, 'linear');
        },

        /**
         * Updates the buttons status and toggles their visibility.
         *
         * @public
         * @method updateButtons
         */
        updateButtons: function () {
            var me = this,
                viewPortWidth = me.$viewPort.width(),
                maxWidth = me._width - me.$viewPort.width();

            if (viewPortWidth >= me._width) {
                me.toggleLeftArrow(false);
                me.toggleRightArrow(false);
                return;
            }

            me.toggleLeftArrow(me._offset > 0);
            me.toggleRightArrow(me._offset < maxWidth);
        },

        /**
         * Toggles the visibility of the left arrow and the left gradient (:before)
         *
         * @public
         * @method toggleLeftArrow
         * @param {Boolean} visible
         */
        toggleLeftArrow: function (visible) {
            var me = this;

            me.$leftArrow.toggle(visible);
            me.$el.toggleClass('is--left', !visible);
        },

        /**
         * Toggles the visibility of the right arrow and the right gradient (:after)
         *
         * @public
         * @method toggleRightArrow
         * @param {Boolean} visible
         */
        toggleRightArrow: function (visible) {
            var me = this;

            me.$rightArrow.toggle(visible);
            me.$el.toggleClass('is--right', !visible);
        },

        /**
         * Removed all listeners, classes and values from this plugin.
         *
         * @public
         * @method destroy
         */
        destroy: function () {
            var me = this;

            me.$el.removeClass(me.opts.wrapperClass);
            me.$list.removeClass(me.opts.listClass);

            $.each(me.$list.children(), function (index, el) {
                $(el).removeClass(me.opts.itemClass);
            });

            me.$leftArrow.remove();
            me.$rightArrow.remove();

            me._destroy();
        }
    });
}(jQuery, window, Modernizr));