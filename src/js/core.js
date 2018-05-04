(function($) {
  var pubsub = $({});

  $.subscribe = function() {
    pubsub.on.apply(pubsub, arguments);
  };
  $.unsubscribe = function() {
    pubsub.off.apply(pubsub, arguments);
  };
  $.publish = function() {
    pubsub.trigger.apply(pubsub, arguments);
  };

  pubStack = []; // стэк событий опубликованных до инициализации всех виджетов

  $.initWidgets = function($block) {
    // виджеты могут быть иницилизированны как внутри всей страницы, так и внутри конкретного блока
    var $context = $block || $('html');

    // Если какой-либо виджет публикует событие при инициализации,
    // в момент до того как будет инициализирован виджет который подпишется на это событие
    // то последний не сможет обработать это событие, т.к. оно произойдет раньше подписки.
    // Для это переопределяем метод publish,
    // что все события произошедшие до момента иницилизации всех виджетов попали в массив,
    // из которого мы их вызовем после загрузки всех виджетов
    $.publish = function(eventName, data) {
      pubStack.push({eventName: eventName, data: data});
    };

    $.each($context.find('.js-widget'), function() {
      var $this = $(this),
        config = this.onclick ? this.onclick() : {};

      for (var widget in config) {
        if ($.fn[widget]) {
          $this[widget](config[widget])
          .removeClass('js-widget')
          .addClass('js-widget-inited');
        }
      }
    });

    // возвращаем в исходное состояние
    $.publish = function() {
      pubsub.trigger.apply(pubsub, arguments);
    };

    // вызываем "скопившиеся" опубликованные события
    $.each(pubStack, function() {
      $.publish(this.eventName, this.data);
    });

    // отчищаем стэк опубликованных событий
    pubStack.length = 0;
  };
  $.destroyWidgets = function($block) {
    // виджеты могут быть удалены как внутри всего сайт, так и внутри конкретного блока
    var $context = $block || $('html');

    $.each($context.find('.js-widget-inited'), function() {
      var $this = $(this),
        config = this.onclick ? this.onclick() : {};

      for (var widget in config) {
        if ($.fn[widget]) {
          $this[widget]('destroy')
          .removeClass('js-widget-inited')
          .addClass('js-widget');
        }
      }
    });
  };

}(jQuery));

$(function() {
  // поиск и инициализация всех виджетов на странице
  $.initWidgets();
});